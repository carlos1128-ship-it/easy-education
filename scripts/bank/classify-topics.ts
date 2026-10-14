/**
 * Encaixa cada questão oficial publicada em um TÓPICO da árvore de conteúdo (src/lib/bank/taxonomy.ts).
 * Uma vez só, no servidor, e barato: a IA só escolhe um tópico numa lista fechada (os da matéria da questão),
 * 20 questões por chamada. Não mexe no texto nem no gabarito. Pode rodar de novo: só pega as que estão sem
 * tópico da árvore (ou todas, com --all).
 *
 *   npx tsx --env-file=.env.local scripts/bank/classify-topics.ts [--exam enem] [--subject biologia] [--limit 40] [--all] [--apply]
 *
 * Sem --apply só mostra a escolha das primeiras questões (para conferir antes de gravar).
 */
import { Type } from "@google/genai";
import { topicsOf } from "@/lib/bank/taxonomy";
import { getGemini } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

const MODELS = (process.env.CLASSIFY_MODELS ?? "gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3.5-flash-lite,gemini-2.5-flash").split(",");
const CHUNK = 20;

type Choice = { id: string; topic: number };

async function classify(rows: Array<{ id: string; text: string }>, options: string[]) {
  const list = options.map((option, index) => `${index}: ${option}`).join("\n");
  const prompt = `Você classifica questões de prova do ensino médio. Para cada questão, escolha o NÚMERO do tópico que ela mais cobra para ser resolvida, só desta lista:
${list}

Questões:
${rows.map((row) => `#${row.id}: ${row.text}`).join("\n")}`;
  for (const model of MODELS) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, topic: { type: Type.INTEGER } }, required: ["id", "topic"] } },
        },
      });
      return (JSON.parse(response.text ?? "[]") as Choice[]).filter((row) => Number.isInteger(row.topic) && row.topic >= 0 && row.topic < options.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  ${model}: ${message.slice(0, 120)}`);
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
  }
  return [];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const all = process.argv.includes("--all");
  const examSlug = arg("exam") ?? "enem";
  const onlySubject = arg("subject");
  const limit = Number(arg("limit") ?? (apply ? 100_000 : 40));
  const prisma = getPrisma();

  const subjects = await prisma.bankSubject.findMany({
    where: onlySubject ? { slug: onlySubject } : {},
    select: { id: true, slug: true, name: true, topics: { where: { unitId: { not: null } }, select: { id: true, slug: true } } },
  });
  let done = 0;
  let seen = 0;

  for (const subject of subjects) {
    const tree = topicsOf(subject.slug);
    if (!tree.length) continue;
    const topicId = new Map(subject.topics.map((topic) => [topic.slug, topic.id]));
    if (tree.some((item) => !topicId.has(item.topicSlug))) {
      console.warn(`${subject.slug}: árvore ainda não gravada no banco (rode sync-taxonomy.ts --apply).`);
      continue;
    }
    const options = tree.map((item) => `${item.unit} > ${item.topic}`);
    const rows = await prisma.bankQuestion.findMany({
      where: {
        exam: { slug: examSlug },
        origin: "prova_oficial",
        isPublished: true,
        subjectId: subject.id,
        ...(all ? {} : { OR: [{ topicId: null }, { topic: { unitId: null } }] }),
      },
      select: { id: true, statement: true, supportText: true, options: true },
      orderBy: [{ year: "asc" }, { number: "asc" }],
      take: Math.max(0, limit - seen),
    });
    if (!rows.length) continue;
    seen += rows.length;
    console.log(`${subject.name}: ${rows.length} questões`);

    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK).map((row) => {
        const alternatives = Array.isArray(row.options) ? (row.options as Array<{ text?: string }>).map((option) => option.text ?? "").join(" | ") : "";
        return {
          id: row.id,
          text: `${row.supportText ?? ""} ${row.statement} Alternativas: ${alternatives}`.replace(/!\[[^\]]*\]\([^)]+\)/g, "[figura]").replace(/\s+/g, " ").slice(0, 900),
        };
      });
      const result = await classify(chunk, options);
      for (const choice of result) {
        if (!chunk.some((item) => item.id === choice.id)) continue;
        const picked = tree[choice.topic];
        if (!apply) {
          console.log(`  ${chunk.find((item) => item.id === choice.id)?.text.slice(0, 90)}…\n    → ${picked.unit} > ${picked.topic}`);
          continue;
        }
        await prisma.bankQuestion.update({ where: { id: choice.id }, data: { topicId: topicId.get(picked.topicSlug), subtopic: null } });
        done += 1;
      }
      if (apply) console.log(`  ${Math.min(start + CHUNK, rows.length)}/${rows.length} (total gravadas: ${done})`);
    }
    if (seen >= limit) break;
  }
  console.log(apply ? `Classificadas: ${done} de ${seen}` : `Prévia de ${seen} questões (nada gravado). Rode com --apply para gravar.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
