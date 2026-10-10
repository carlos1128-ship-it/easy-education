/**
 * Relatório da revisão humana das questões geradas (item 1.2). Lê os vereditos dados em
 * /dashboard/interno/questoes e mostra o % de questões corretas por área e por matéria, com intervalo de confiança.
 *
 *   npx tsx --env-file=.env.local scripts/eval/report.ts --batch eval-2026-10-10 --reviewer "Nome do professor" [--model gemini-2.5-flash-lite] [--save] [--out docs/eval/geradas.md]
 *
 * --save grava em ai_quality_scores (kind "geradas"). Com amostra de 30 ou mais, matéria abaixo de 90% passa a
 * gerar com o modelo mais forte (src/lib/ai-quality-gate.ts) até ser reavaliada.
 * Sem --reviewer o script se recusa a gravar: sem revisão humana, o número não vale.
 */
import { writeFileSync } from "node:fs";
import { describeAccuracy, MIN_SAMPLE, QUALITY_FLOOR, QUALITY_TARGET, formatPercent, wilsonInterval } from "@/lib/ai-quality";
import { ENEM_AREAS, slugify } from "@/lib/bank/constants";
import { getPrisma } from "@/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

/** Nome da matéria no banco → como o aluno costuma escrever (o portão compara pela matéria pedida). */
const ALIASES: Record<string, string[]> = { "lingua-portuguesa": ["portugues"] };

async function main() {
  const batch = arg("batch");
  if (!batch) throw new Error("Informe --batch (o lote do generate-sample).");
  const reviewer = arg("reviewer");
  const model = arg("model") ?? "padrão do app";
  const save = process.argv.includes("--save");
  if (save && !reviewer) throw new Error("Informe --reviewer: sem revisão humana, o resultado não pode alimentar o portão.");
  const prisma = getPrisma();

  const rows = await prisma.bankQuestion.findMany({ where: { importBatch: batch }, select: { area: true, reviewStatus: true, subject: { select: { name: true } } } });
  const judged = rows.filter((row) => row.reviewStatus === "avaliada_correta" || row.reviewStatus === "avaliada_incorreta");
  const lines: string[] = [];
  const log = (line = "") => {
    console.log(line);
    lines.push(line);
  };

  log(`## Questões geradas × revisão humana (lote ${batch})`);
  log();
  log(`Modelo de geração: ${model}. Revisor: ${reviewer ?? "NÃO INFORMADO"}. Revisadas: ${judged.length} de ${rows.length}.`);
  if (!judged.length) {
    log();
    log("**Sem revisão humana ainda: não há número para publicar.**");
  }
  log();

  type Group = { correct: number; total: number };
  const tally = (key: (row: (typeof judged)[number]) => string) => {
    const groups = new Map<string, Group>();
    for (const row of judged) {
      const group = groups.get(key(row)) ?? { correct: 0, total: 0 };
      group.total += 1;
      if (row.reviewStatus === "avaliada_correta") group.correct += 1;
      groups.set(key(row), group);
    }
    return groups;
  };

  const verdict = (group: Group) =>
    group.total < MIN_SAMPLE ? "amostra pequena" : group.correct / group.total >= QUALITY_TARGET ? "meta" : group.correct / group.total >= QUALITY_FLOOR ? "acima do piso" : "PLANO B";

  log("| Área | Corretas | Situação |");
  log("|---|---|---|");
  for (const [area, group] of tally((row) => row.area ?? "sem-area")) {
    log(`| ${ENEM_AREAS[area] ?? area} | ${describeAccuracy(group.correct, group.total)} | ${verdict(group)} |`);
    if (save) await prisma.aiQualityScore.create({ data: { scope: `area:${area}`, kind: "geradas", model, sample: group.total, correct: group.correct, lowerBound: wilsonInterval(group.correct, group.total).low, reviewer, notes: batch } });
  }
  log();
  log("| Matéria | Corretas | Situação |");
  log("|---|---|---|");
  for (const [name, group] of tally((row) => row.subject?.name ?? "Sem matéria")) {
    log(`| ${name} | ${describeAccuracy(group.correct, group.total)} | ${verdict(group)} |`);
    if (save && name !== "Sem matéria") {
      for (const slug of [slugify(name), ...(ALIASES[slugify(name)] ?? [])]) {
        await prisma.aiQualityScore.create({ data: { scope: `materia:${slug}`, kind: "geradas", model, sample: group.total, correct: group.correct, lowerBound: wilsonInterval(group.correct, group.total).low, reviewer, notes: batch } });
      }
    }
  }
  const total = judged.filter((row) => row.reviewStatus === "avaliada_correta").length;
  log();
  log(`**Total: ${describeAccuracy(total, judged.length)}.** Piso ${formatPercent(QUALITY_FLOOR)}, meta ${formatPercent(QUALITY_TARGET)}, amostra mínima ${MIN_SAMPLE} por escopo.`);
  if (arg("out")) writeFileSync(arg("out")!, `${lines.join("\n")}\n`, "utf8");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
