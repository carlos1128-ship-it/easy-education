/**
 * Medição 1 do item 1.2: quanto confiar no verificador (o resolvedor às cegas de src/lib/question-quality.ts).
 * Ele resolve as questões OFICIAIS do ENEM já importadas, sem ver o gabarito, e o resultado é comparado com
 * o gabarito oficial do INEP. Rode com dois modelos para ver se um modelo diferente erra menos.
 *
 *   npx tsx --env-file=.env.local scripts/eval/verifier.ts --models gemini-2.5-flash-lite,gemini-2.5-flash [--per-area 60] [--save] [--out docs/eval/verificador.md]
 *
 * - Só entram questões sem imagem (o verificador recebe só texto; questão com figura seria injusta com ele).
 * - Amostra por área com semente fixa (--seed), para dar para repetir.
 * - --save grava o resultado em ai_quality_scores (kind "verificador", escopo "area:<slug>").
 * - Custo: cerca de US$ 0,0005 por questão no flash-lite e US$ 0,002 no flash (estimativa; o total real sai no fim).
 */
import { writeFileSync } from "node:fs";
import { describeAccuracy, wilsonInterval } from "@/lib/ai-quality";
import { runWithAiCallContext } from "@/lib/ai-cost";
import { ENEM_AREAS, ORIGIN } from "@/lib/bank/constants";
import type { BankOption } from "@/lib/bank/import";
import { getPrisma } from "@/lib/prisma";
import { solveBlind } from "@/lib/question-quality";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

/** Embaralhamento determinístico (mulberry32), para a amostra sair igual com a mesma semente. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample<T>(items: T[], size: number, random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return size > 0 ? copy.slice(0, size) : copy;
}

async function withBackoff<T>(run: () => Promise<T>) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/429|quota|RESOURCE_EXHAUSTED/i.test(message) || attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20_000 + attempt * 15_000));
    }
  }
}

async function main() {
  const models = (arg("models") ?? "gemini-2.5-flash-lite").split(",").map((model) => model.trim()).filter(Boolean);
  const perArea = Number(arg("per-area") ?? 60);
  const seed = Number(arg("seed") ?? 20261010);
  const save = process.argv.includes("--save");
  const out = arg("out");
  const prisma = getPrisma();
  const startedAt = new Date();

  const rows = await prisma.bankQuestion.findMany({
    where: { origin: ORIGIN.official, isPublished: true, images: { equals: [] } },
    select: { id: true, area: true, year: true, number: true, statement: true, supportText: true, options: true, correctLabel: true },
  });
  const textOnly = rows.filter((row) => (row.options as BankOption[]).every((option) => !option.imageUrl && option.text?.trim()));
  const random = seeded(seed);
  const byArea = new Map<string, typeof textOnly>();
  for (const area of Object.keys(ENEM_AREAS)) byArea.set(area, sample(textOnly.filter((row) => row.area === area), perArea, random));
  const picked = [...byArea.values()].flat();

  const lines: string[] = [];
  const log = (line = "") => {
    console.log(line);
    lines.push(line);
  };
  log(`## Verificador × gabarito oficial (${startedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })})`);
  log();
  log(`Questões oficiais publicadas: ${rows.length}; sem imagem e com alternativas só de texto: ${textOnly.length}; amostra: ${picked.length} (até ${perArea} por área, semente ${seed}).`);
  log();

  const answersByModel = new Map<string, Map<string, string>>();
  for (const model of models) {
    const answers = new Map<string, string>();
    for (let i = 0; i < picked.length; i += 15) {
      const batch = picked.slice(i, i + 15);
      const questions = batch.map((row) => ({
        question: [row.supportText, row.statement].filter(Boolean).join("\n").slice(0, 4000),
        options: (row.options as BankOption[]).map((option) => `${option.label}) ${option.text}`),
      }));
      const solved = await withBackoff(() => runWithAiCallContext({ userId: null, plan: null, feature: "eval_verifier" }, () => solveBlind(questions, 5, { model })));
      batch.forEach((row, index) => answers.set(row.id, solved.get(index) ?? "?"));
      process.stdout.write(`\r${model}: ${Math.min(i + 15, picked.length)}/${picked.length}`);
    }
    process.stdout.write("\n");
    answersByModel.set(model, answers);

    log(`### ${model}`);
    log();
    log("| Área | Acerto do verificador |");
    log("|---|---|");
    for (const [area, items] of byArea) {
      const correct = items.filter((row) => answers.get(row.id) === row.correctLabel).length;
      log(`| ${ENEM_AREAS[area]} | ${describeAccuracy(correct, items.length)} |`);
      if (save && items.length) {
        await prisma.aiQualityScore.create({
          data: { scope: `area:${area}`, kind: "verificador", model, sample: items.length, correct, lowerBound: wilsonInterval(correct, items.length).low, notes: `semente ${seed}` },
        });
      }
    }
    const total = picked.filter((row) => answers.get(row.id) === row.correctLabel).length;
    log(`| **Total** | **${describeAccuracy(total, picked.length)}** |`);
    log();
  }

  if (models.length >= 2) {
    const [a, b] = models;
    const first = answersByModel.get(a)!;
    const second = answersByModel.get(b)!;
    const bothWrong = picked.filter((row) => first.get(row.id) !== row.correctLabel && second.get(row.id) !== row.correctLabel).length;
    const sameWrong = picked.filter((row) => first.get(row.id) !== row.correctLabel && first.get(row.id) === second.get(row.id)).length;
    const onlyFirst = picked.filter((row) => first.get(row.id) !== row.correctLabel && second.get(row.id) === row.correctLabel).length;
    log(`### ${a} × ${b}`);
    log();
    log(`- Os dois erram a mesma questão: ${bothWrong} de ${picked.length}; erram com a MESMA letra: ${sameWrong}.`);
    log(`- ${a} erra e ${b} acerta: ${onlyFirst}. Se este número for alto e o "mesma letra" baixo, conferir com o outro modelo pega mais erros.`);
    log();
  }

  const cost = await prisma.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: startedAt }, feature: "eval_verifier" } });
  log(`Custo desta medição: US$ ${Number(cost._sum.costUsd ?? 0).toFixed(4)}.`);
  if (out) writeFileSync(out, `${lines.join("\n")}\n`, "utf8");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
