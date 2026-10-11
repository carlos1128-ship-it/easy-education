/**
 * Confere a transcrição das provas importadas de PDF: a IA resolve cada questão SEM ver o gabarito. Se a
 * resposta divergir do gabarito oficial, um modelo mais forte resolve de novo; se ainda divergir, a questão é
 * despublicada e marcada para revisão (review_status continua "nao_revisada", import_batch ganha "-revisar").
 * Questão com transcrição errada (alternativa trocada, trecho faltando) costuma cair aqui.
 *
 *   npx tsx --env-file=.env.local scripts/bank/verify-transcription.ts --exam etec
 *   npx tsx --env-file=.env.local scripts/bank/verify-transcription.ts --exam etec --dry
 */
import { Type, type Part } from "@google/genai";
import { getGemini } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

type Row = { id: string; number: number; year: number; edition: string; statement: string; supportText: string | null; options: unknown; correctLabel: string; images: unknown };

const imageCache = new Map<string, Part | null>();
async function imagePart(url: string): Promise<Part | null> {
  if (imageCache.has(url)) return imageCache.get(url) ?? null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const part = response.ok ? { inlineData: { mimeType: response.headers.get("content-type") ?? "image/webp", data: Buffer.from(await response.arrayBuffer()).toString("base64") } } : null;
    imageCache.set(url, part);
    return part;
  } catch {
    return null;
  }
}

function questionText(row: Row) {
  const options = (row.options as Array<{ label: string; text: string; imageUrl: string | null }>).map((option) => `(${option.label}) ${option.text || "[imagem]"}`).join("\n");
  return `${(row.supportText ?? "").replace(/!\[[^\]]*\]\([^)]+\)/g, "[figura]")}\n\n${row.statement}\n${options}`;
}

async function solve(rows: Row[], model: string) {
  const parts: Part[] = [{ text: "Resolva cada questão de prova abaixo e responda só com a letra da alternativa correta de cada uma. As figuras vêm logo depois do texto da questão a que pertencem." }];
  for (const row of rows) {
    parts.push({ text: `\n=== Questão id ${row.id} ===\n${questionText(row)}` });
    for (const url of (row.images as string[] | null) ?? []) {
      const part = await imagePart(url);
      if (part) parts.push(part);
    }
  }
  const response = await getGemini().models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, answer: { type: Type.STRING } }, required: ["id", "answer"] } },
    },
  });
  const answers = JSON.parse(response.text ?? "[]") as Array<{ id: string; answer: string }>;
  return new Map(answers.map((item) => [item.id, item.answer.trim().toUpperCase().slice(0, 1)]));
}

async function solveWithFallback(rows: Row[], models: string[]) {
  for (const model of models) {
    try {
      return await solve(rows, model);
    } catch (error) {
      console.warn(`  ${model}: ${error instanceof Error ? error.message.slice(0, 140) : error}`);
    }
  }
  return new Map<string, string>();
}

async function main() {
  const examSlug = arg("exam") ?? "etec";
  const prisma = getPrisma();
  const rows = (await prisma.bankQuestion.findMany({
    where: { exam: { slug: examSlug }, origin: "prova_oficial", isPublished: true },
    select: { id: true, number: true, year: true, edition: true, statement: true, supportText: true, options: true, correctLabel: true, images: true },
    orderBy: [{ year: "asc" }, { edition: "asc" }, { number: "asc" }],
  })) as Row[];
  console.log(`${rows.length} questões publicadas de ${examSlug}`);

  const suspicious: Row[] = [];
  for (let start = 0; start < rows.length; start += 8) {
    const chunk = rows.slice(start, start + 8);
    const answers = await solveWithFallback(chunk, ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash-lite"]);
    for (const row of chunk) if (answers.get(row.id) !== row.correctLabel) suspicious.push(row);
    if ((start / 8) % 10 === 0) console.log(`  ${start + chunk.length}/${rows.length} conferidas, ${suspicious.length} divergentes`);
  }
  console.log(`1ª passada: ${suspicious.length} divergentes`);

  const confirmed: Row[] = [];
  for (const row of suspicious) {
    const answers = await solveWithFallback([row], ["gemini-2.5-flash", "gemini-3.5-flash-lite"]);
    const answer = answers.get(row.id);
    if (answer && answer !== row.correctLabel) {
      confirmed.push(row);
      console.log(`  diverge: ${row.year} ${row.edition} Q${row.number} (oficial ${row.correctLabel}, IA ${answer})`);
    }
  }
  console.log(`Divergentes depois da 2ª passada: ${confirmed.length}`);

  if (!flag("dry") && confirmed.length) {
    for (const row of confirmed) {
      const current = await prisma.bankQuestion.findUnique({ where: { id: row.id }, select: { importBatch: true } });
      await prisma.bankQuestion.update({ where: { id: row.id }, data: { isPublished: false, importBatch: `${current?.importBatch ?? examSlug}-revisar` } });
    }
    console.log(`${confirmed.length} questões despublicadas para revisão.`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
