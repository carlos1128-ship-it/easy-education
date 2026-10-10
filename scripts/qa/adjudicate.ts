/**
 * Desempate das divergências da bateria (scripts/qa/battery.ts): quando a IA independente discordou do gabarito,
 * um juiz com raciocínio longo resolve a questão e diz se o gabarito do app está certo, errado ou se a questão
 * tem problema (duas certas, nenhuma certa, dado faltando).
 *
 *   npx tsx --env-file=.env.local scripts/qa/adjudicate.ts docs/qa/bateria-AAAA.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Type } from "@google/genai";
import { runWithAiCallContext } from "@/lib/ai-cost";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { explanationContradictsAnswer } from "@/lib/quiz-questions";

type Item = { profile: string; kind: string; subject: string; agree: boolean; question: string; gabarito: string; outra: string; quizId: string };

async function main() {
  const file = process.argv[2];
  const report = JSON.parse(readFileSync(file, "utf8"));
  const items: Item[] = report.independent.filter((item: Item) => !item.agree);
  const prisma = getPrisma();
  const verdicts: Array<Record<string, unknown>> = [];
  for (const item of items) {
    const row = await prisma.quizQuestion.findFirst({ where: { quizId: item.quizId, question: item.question } });
    if (!row) continue;
    const options = row.options as string[];
    const judged = await runWithAiCallContext({ userId: null, plan: null, feature: "qa_adjudicate" }, () =>
      generateJSON<{ correta: string; situacao: "gabarito_certo" | "gabarito_errado" | "questao_com_problema"; motivo: string }>(
        `Resolva com cuidado esta questão de múltipla escolha, fazendo as contas, e compare com o gabarito informado.

${row.question}
${options.join("\n")}

Gabarito informado: ${row.correctAnswer}
Explicação informada: ${row.explanation}

Responda JSON: "correta" = a letra que você considera correta; "situacao" = "gabarito_certo" se o gabarito informado está certo, "gabarito_errado" se outra alternativa é a certa, "questao_com_problema" se há mais de uma certa, nenhuma certa ou falta dado; "motivo" = uma frase.`,
        {
          model: "gemini-2.5-flash",
          thinkingBudget: 4096,
          temperature: 0,
          schema: {
            type: Type.OBJECT,
            properties: { correta: { type: Type.STRING }, situacao: { type: Type.STRING, enum: ["gabarito_certo", "gabarito_errado", "questao_com_problema"] }, motivo: { type: Type.STRING } },
            required: ["correta", "situacao", "motivo"],
          },
        },
      ),
    ).catch((error: unknown) => ({ correta: "?", situacao: "erro" as const, motivo: error instanceof Error ? error.message : String(error) }));
    const caught = explanationContradictsAnswer({ question: row.question, options, correctAnswer: row.correctAnswer, explanation: row.explanation });
    verdicts.push({ ...item, options, explanation: row.explanation, ...judged, pegaPelaTrava: caught });
    console.log(`[${item.subject}] gabarito ${row.correctAnswer} · outra ${item.outra} · juiz ${judged.correta}: ${judged.situacao}${caught ? " (a trava nova pega)" : ""}`);
  }
  const count = (situacao: string) => verdicts.filter((verdict) => verdict.situacao === situacao).length;
  const total = report.independent.length;
  console.log(`\nDe ${total} questões: ${items.length} divergências → gabarito errado ${count("gabarito_errado")}, questão com problema ${count("questao_com_problema")}, gabarito certo ${count("gabarito_certo")}.`);
  console.log(`Estimativa de questões com erro: ${(((count("gabarito_errado") + count("questao_com_problema")) / total) * 100).toFixed(1)}% (só conta as que a outra IA pegou; erros em que as duas IAs concordam não aparecem aqui).`);
  report.adjudication = verdicts;
  writeFileSync(file, JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
