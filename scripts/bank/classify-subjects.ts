/**
 * Classifica a MATÉRIA das questões oficiais que ainda não têm (ex.: ENEM, que vem da fonte só com a grande área).
 * Barato: a IA só escolhe uma matéria numa lista fechada (as matérias da área da questão), 25 questões por chamada.
 * Não mexe no texto nem no gabarito. Pode rodar de novo: só pega as que continuam sem matéria.
 *
 *   npx tsx --env-file=.env.local scripts/bank/classify-subjects.ts --exam enem
 */
import { Type } from "@google/genai";
import { SEED_SUBJECTS } from "@/lib/bank/constants";
import { getGemini } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

const MODELS = (process.env.CLASSIFY_MODELS ?? "gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3.5-flash-lite,gemini-2.5-flash").split(",");

async function classify(rows: Array<{ id: string; text: string }>, allowed: string[]) {
  const prompt = `Classifique cada questão de prova em UMA matéria, usando só estes slugs: ${allowed.join(", ")}.
Escolha a matéria do conhecimento que a questão cobra para ser resolvida.
${rows.map((row) => `#${row.id}: ${row.text}`).join("\n")}`;
  for (const model of MODELS) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, subject: { type: Type.STRING, enum: allowed } }, required: ["id", "subject"] } },
        },
      });
      return (JSON.parse(response.text ?? "[]") as Array<{ id: string; subject: string }>).filter((row) => allowed.includes(row.subject));
    } catch (error) {
      console.warn(`  ${model}: ${error instanceof Error ? error.message.slice(0, 120) : error}`);
    }
  }
  return [];
}

async function main() {
  const examSlug = arg("exam") ?? "enem";
  const prisma = getPrisma();
  const subjects = await prisma.bankSubject.findMany({ select: { id: true, slug: true } });
  const idOf = new Map(subjects.map((subject) => [subject.slug, subject.id]));
  const rows = await prisma.bankQuestion.findMany({
    where: { exam: { slug: examSlug }, origin: "prova_oficial", subjectId: null },
    select: { id: true, area: true, variant: true, statement: true, supportText: true },
  });
  console.log(`${rows.length} questões de ${examSlug} sem matéria`);
  let done = 0;

  // Língua estrangeira já tem a matéria pela variante.
  for (const row of rows.filter((item) => item.variant === "ingles" || item.variant === "espanhol")) {
    await prisma.bankQuestion.update({ where: { id: row.id }, data: { subjectId: idOf.get(row.variant) } });
    done += 1;
  }

  const byArea = new Map<string, typeof rows>();
  for (const row of rows.filter((item) => !item.variant)) byArea.set(row.area ?? "", [...(byArea.get(row.area ?? "") ?? []), row]);

  for (const [area, items] of byArea) {
    const allowed = SEED_SUBJECTS.filter((subject) => !area || subject.area === area)
      .map((subject) => subject.slug)
      .filter((slug) => slug !== "ingles" && slug !== "espanhol");
    if (allowed.length === 1) {
      await prisma.bankQuestion.updateMany({ where: { id: { in: items.map((item) => item.id) } }, data: { subjectId: idOf.get(allowed[0]) } });
      done += items.length;
      console.log(`  ${area}: ${items.length} → ${allowed[0]}`);
      continue;
    }
    for (let start = 0; start < items.length; start += 25) {
      const chunk = items.slice(start, start + 25).map((item) => ({
        id: item.id,
        text: `${item.supportText ?? ""} ${item.statement}`.replace(/!\[[^\]]*\]\([^)]+\)/g, "[figura]").replace(/\s+/g, " ").slice(0, 600),
      }));
      const result = await classify(chunk, allowed);
      for (const row of result) {
        if (!chunk.some((item) => item.id === row.id)) continue;
        await prisma.bankQuestion.update({ where: { id: row.id }, data: { subjectId: idOf.get(row.subject) } });
        done += 1;
      }
      console.log(`  ${area}: ${Math.min(start + 25, items.length)}/${items.length} (total classificadas: ${done})`);
    }
  }
  console.log(`Classificadas: ${done} de ${rows.length}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
