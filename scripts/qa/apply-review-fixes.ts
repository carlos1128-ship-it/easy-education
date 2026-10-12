/**
 * Aplica as correções da revisão por subagentes (12/10/2026) nas questões geradas por IA (shared_questions)
 * e no ENEM oficial (bank_questions). Os achados vêm de dois JSON consolidados (--pool e --enem).
 *
 * Regras (conservadoras):
 *  - gabarito errado, nenhuma ou duas corretas, ambígua, enunciado incompleto, erro de fato, explicação que contradiz
 *    o gabarito → a questão SAI do banco compartilhado (é conteúdo de IA, regenerável). Errar o gabarito é pior que ter menos questões.
 *  - explicação errada com texto novo sugerido → troca só a explicação.
 *  - erro de digitação → troca o trecho exato.
 *  - "cita a alternativa pela letra" → ignorado: o app já ajusta as letras ao embaralhar (remapLetterMentions).
 *  - ENEM oficial: despublica enunciado incompleto e transcrição suspeita; nunca apaga.
 *
 *   npx tsx --env-file=.env.local scripts/qa/apply-review-fixes.ts --pool <pool.json> --enem <enem.json>           (simula)
 *   npx tsx --env-file=.env.local scripts/qa/apply-review-fixes.ts --pool <pool.json> --enem <enem.json> --apply
 */
import { readFileSync } from "node:fs";
import { getPrisma } from "@/lib/prisma";

type Finding = { id: string; tipo: string; gravidade: string; nota: string; correcao_sugerida?: string; lote: string };

const REMOVE_TYPES = new Set(["gabarito_errado", "nenhuma_correta", "duas_corretas", "ambigua", "enunciado_incompleto", "erro_de_fato", "explicacao_contradiz_gabarito"]);

/** Erros de digitação confirmados um a um (prefixo do id → trocas exatas no enunciado, nas alternativas e na explicação). */
const TYPO_FIXES: Record<string, Array<[string, string]>> = {
  "7a36f968": [["posibles", "possíveis"]],
  "90f24560": [["Ggentrificação", "Gentrificação"], ["Ggentrificacao", "Gentrificacao"]],
  "8f9d0796": [["o poder the detenha o poder", "o poder detenha o poder"]],
  ba6cb0f7: [["operários barulhentos e não qualificados", "operários não qualificados"]],
  "08e40f5b": [["impuesto", "imposto"], ["opuesto", "oposto"]],
  "3098fb65": [["sarpo", "sarrafo"]],
};
/** Questões "outro" que saem: duplicadas ou com alternativa que se contradiz / texto corrompido. */
const REMOVE_OTHER = new Set(["e1a60071", "c19e9ffe", "85937fdf", "3df99d4f"]);
/** Rodada 2: tudo o que o revisor marcar nesta lista vai embora, seja qual for o tipo (explicação reescrita na rodada 1 saiu quebrada, ou a dúvida é de fato). */
const REMOVE_ANY = new Set((arg("remove-any") ?? "").split(",").filter(Boolean));

/** Texto de explicação sugerido por revisor que ainda traz instrução de edição ou vem truncado: não serve. */
const BAD_SUGGESTION = /(\(\s*corrigir|corrigir (tamb[ée]m|o texto)|substituir (a|o) |trocar a alternativa|reescrever alternativa|\[.*\]|^\s*\.\.\.|TODO)/i;

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const load = (path: string | undefined): Finding[] => (path ? (JSON.parse(readFileSync(path, "utf8")) as Finding[]) : []);

function replaceDeep(value: unknown, from: string, to: string): unknown {
  if (typeof value === "string") return value.split(from).join(to);
  if (Array.isArray(value)) return value.map((item) => replaceDeep(item, from, to));
  return value;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = getPrisma();
  const pool = load(arg("pool"));
  const enem = load(arg("enem"));
  const stats = { copies: 0, emptyQuizzes: 0, removed: 0, explanation: 0, typo: 0, ignored: 0, enemUnpublished: 0, enemExplanation: 0, enemOptionFix: 0 };

  /** Cópias ainda não respondidas da questão em quizzes de alunos: saem junto, para ninguém ver um gabarito errado. */
  async function dropUnansweredCopies(question: string, doIt: boolean) {
    const copies = await prisma.quizQuestion.findMany({ where: { question, userAnswer: null }, select: { id: true, quizId: true } });
    if (!copies.length) return 0;
    if (doIt) {
      await prisma.quizQuestion.deleteMany({ where: { id: { in: copies.map((copy) => copy.id) } } });
      for (const quizId of new Set(copies.map((copy) => copy.quizId))) {
        const left = await prisma.quizQuestion.count({ where: { quizId } });
        if (!left) {
          await prisma.quiz.delete({ where: { id: quizId } });
          stats.emptyQuizzes += 1;
        } else {
          await prisma.quiz.update({ where: { id: quizId }, data: { questionCount: left } });
        }
      }
    }
    return copies.length;
  }

  // Um achado por questão: o mais grave decide (remover ganha de tudo).
  const byId = new Map<string, Finding[]>();
  for (const finding of pool) byId.set(finding.id, [...(byId.get(finding.id) ?? []), finding]);

  for (const [id, findings] of byId) {
    const short = id.slice(0, 8);
    const row = await prisma.sharedQuestion.findUnique({ where: { id } });
    if (!row) continue;
    const mustRemove = REMOVE_ANY.has(short) || findings.some((item) => REMOVE_TYPES.has(item.tipo) || (item.tipo === "outro" && REMOVE_OTHER.has(short)));
    if (mustRemove) {
      console.log(`remover  ${short} ${findings.map((item) => item.tipo).join("+")}`);
      stats.copies += await dropUnansweredCopies(row.question, apply);
      if (apply) await prisma.sharedQuestion.delete({ where: { id } });
      stats.removed += 1;
      continue;
    }
    const data: { explanation?: string; question?: string; options?: unknown } = {};
    for (const finding of findings) {
      const suggestion = finding.correcao_sugerida ?? "";
      if (finding.tipo === "explicacao_errada") {
        const match = suggestion.match(/^reescrever explica[cç][aã]o:\s*([\s\S]{40,})$/i);
        if (match && !BAD_SUGGESTION.test(match[1])) {
          data.explanation = match[1].trim().replace(/^["“']|["”']$/g, "");
          stats.explanation += 1;
          console.log(`explicação ${short}`);
        } else {
          // Sem texto novo utilizável: sai do banco em vez de ficar com explicação errada.
          console.log(`remover  ${short} explicacao_errada sem texto novo`);
          stats.copies += await dropUnansweredCopies(row.question, apply);
          if (apply) await prisma.sharedQuestion.delete({ where: { id } });
          stats.removed += 1;
          data.explanation = undefined;
          break;
        }
      } else if (finding.tipo === "outro" && TYPO_FIXES[short]) {
        let question = data.question ?? row.question;
        let options: unknown = data.options ?? row.options;
        let explanation = data.explanation ?? row.explanation;
        for (const [from, to] of TYPO_FIXES[short]) {
          question = question.split(from).join(to);
          options = replaceDeep(options, from, to);
          explanation = explanation.split(from).join(to);
        }
        data.question = question;
        data.options = options;
        data.explanation = explanation;
        stats.typo += 1;
        console.log(`digitação ${short}`);
      } else {
        stats.ignored += 1;
      }
    }
    if (apply && Object.keys(data).some((key) => (data as Record<string, unknown>)[key] !== undefined)) {
      await prisma.sharedQuestion.update({ where: { id }, data: data as never });
    }
  }

  // ENEM oficial: nunca apaga; só despublica o que está quebrado e corrige o que a fonte trouxe corrompido.
  for (const finding of enem) {
    const short = finding.id.slice(0, 8);
    if (finding.tipo === "enunciado_incompleto" || (finding.tipo === "transcricao_suspeita" && /despublicar/i.test(finding.correcao_sugerida ?? ""))) {
      console.log(`ENEM despublicar ${short} ${finding.tipo}`);
      if (apply) await prisma.bankQuestion.update({ where: { id: finding.id }, data: { isPublished: false, importBatch: "enem-revisar" } });
      stats.enemUnpublished += 1;
    } else if (finding.tipo === "transcricao_suspeita" && short === "12471a90") {
      const row = await prisma.bankQuestion.findUnique({ where: { id: finding.id }, select: { options: true } });
      const options = (row?.options ?? []) as Array<{ label: string; text: string; imageUrl?: string | null }>;
      const next = options.map((option) => (option.label === "A" && /O consultaras/.test(option.text) ? { ...option, text: "Consultar as autoridades para verificar a possibilidade de viagem." } : option));
      console.log(`ENEM alternativa A corrigida ${short}`);
      if (apply) await prisma.bankQuestion.update({ where: { id: finding.id }, data: { options: next } });
      stats.enemOptionFix += 1;
    } else if (finding.tipo === "explicacao_errada") {
      const match = (finding.correcao_sugerida ?? "").match(/^reescrever explica[cç][aã]o:\s*([\s\S]{40,})$/i);
      if (match) {
        console.log(`ENEM explicação ${short}`);
        if (apply) await prisma.bankQuestion.update({ where: { id: finding.id }, data: { explanation: match[1].trim() } });
        stats.enemExplanation += 1;
      }
    }
  }

  console.log(`\n${apply ? "APLICADO" : "SIMULAÇÃO"}:`, JSON.stringify(stats));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
