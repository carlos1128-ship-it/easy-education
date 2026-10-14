/**
 * Grava a árvore de conteúdo (src/lib/bank/taxonomy.ts) no banco: cria/atualiza unidades e tópicos
 * e a ordem de cada um. Não apaga nada e não mexe nas questões. Pode rodar de novo quando a árvore mudar.
 *
 *   npx tsx --env-file=.env.local scripts/bank/sync-taxonomy.ts          (só mostra o que faria)
 *   npx tsx --env-file=.env.local scripts/bank/sync-taxonomy.ts --apply
 */
import { TAXONOMY, slugify } from "@/lib/bank/taxonomy";
import { getPrisma } from "@/lib/prisma";

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = getPrisma();
  const subjects = new Map((await prisma.bankSubject.findMany({ select: { id: true, slug: true } })).map((subject) => [subject.slug, subject.id]));
  let units = 0;
  let topics = 0;

  for (const subject of TAXONOMY) {
    const subjectId = subjects.get(subject.slug);
    if (!subjectId) {
      console.warn(`Matéria ${subject.slug} não existe no banco; pulei.`);
      continue;
    }
    for (const [unitIndex, unit] of subject.units.entries()) {
      units += 1;
      topics += unit.topics.length;
      if (!apply) continue;
      const saved = await prisma.bankUnit.upsert({
        where: { subjectId_slug: { subjectId, slug: slugify(unit.name) } },
        update: { name: unit.name, sortOrder: unitIndex },
        create: { subjectId, slug: slugify(unit.name), name: unit.name, sortOrder: unitIndex },
      });
      for (const [topicIndex, topic] of unit.topics.entries()) {
        await prisma.bankTopic.upsert({
          where: { subjectId_slug: { subjectId, slug: slugify(topic) } },
          update: { name: topic, unitId: saved.id, sortOrder: topicIndex },
          create: { subjectId, slug: slugify(topic), name: topic, unitId: saved.id, sortOrder: topicIndex },
        });
      }
    }
  }
  console.log(`${apply ? "Gravadas" : "Seriam gravadas"}: ${units} unidades e ${topics} tópicos em ${TAXONOMY.length} matérias.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
