/**
 * Corrige gabaritos do ENEM que divergiram do gabarito oficial do INEP (conferência de 14/10/2026 com
 * scripts/bank/enem-official.ts). Só entram divergências isoladas, num caderno em que todo o resto confere; a
 * questão de língua estrangeira (2020, Q5) ficou de fora para conferência manual.
 *
 * A resolução comentada dessas questões foi escrita para a letra errada: é apagada e volta a "pendente" (é gerada
 * de novo quando a questão for usada). Os valores antigos ficam em docs/qa/correcoes-gabarito-enem-2026-10-14.json.
 *
 *   npx tsx --env-file=.env.local scripts/bank/fix-enem-keys.ts           (só mostra)
 *   npx tsx --env-file=.env.local scripts/bank/fix-enem-keys.ts --apply
 */
import { mkdir, writeFile } from "node:fs/promises";
import { getPrisma } from "@/lib/prisma";

/** Ano, número da questão e a letra do gabarito oficial (caderno azul). */
const FIXES: Array<[number, number, string]> = [
  [2022, 143, "D"],
  [2021, 15, "D"],
  [2021, 25, "B"],
  [2021, 38, "C"],
  [2021, 53, "B"],
  [2021, 139, "E"],
  [2021, 145, "C"],
  [2021, 152, "E"],
  [2018, 15, "D"],
  [2012, 165, "C"],
  [2011, 81, "D"],
  [2011, 95, "D"],
];

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = getPrisma();
  const log: Array<Record<string, unknown>> = [];
  for (const [year, number, official] of FIXES) {
    const rows = await prisma.bankQuestion.findMany({
      where: { exam: { slug: "enem" }, origin: "prova_oficial", isPublished: true, year, number, variant: "" },
      select: { id: true, correctLabel: true, explanation: true, explanationStatus: true },
    });
    if (rows.length !== 1) {
      console.log(`ENEM ${year} Q${number}: ${rows.length} questões encontradas; pulei.`);
      continue;
    }
    const row = rows[0];
    if (row.correctLabel === official) {
      console.log(`ENEM ${year} Q${number}: já está ${official}.`);
      continue;
    }
    console.log(`ENEM ${year} Q${number}: ${row.correctLabel} → ${official}${apply ? "" : " (simulação)"}`);
    log.push({ id: row.id, year, number, before: row.correctLabel, after: official, explanationBefore: row.explanation, explanationStatusBefore: row.explanationStatus });
    if (apply) {
      await prisma.bankQuestion.update({ where: { id: row.id }, data: { correctLabel: official, explanation: null, explanationStatus: "pendente" } });
    }
  }
  if (apply && log.length) {
    await mkdir("docs/qa", { recursive: true });
    await writeFile("docs/qa/correcoes-gabarito-enem-2026-10-14.json", `${JSON.stringify(log, null, 2)}\n`);
  }
  console.log(apply ? `Corrigidas: ${log.length}.` : `Seriam corrigidas: ${log.length}. Rode com --apply.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
