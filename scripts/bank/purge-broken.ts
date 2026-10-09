/**
 * Remove do banco as questões cuja imagem a fonte marcou como quebrada ("broken-image"),
 * desde que nenhum aluno tenha respondido (senão só despublica). Pode rodar de novo.
 *
 *   npx tsx --env-file=.env.local scripts/bank/purge-broken.ts
 */
import { getPrisma } from "@/lib/prisma";

async function main() {
  const prisma = getPrisma();
  const broken = await prisma.bankQuestion.findMany({
    where: { OR: [{ supportText: { contains: "broken-image" } }, { statement: { contains: "broken-image" } }] },
    select: { id: true, year: true, number: true, _count: { select: { answers: true } } },
  });
  // As imagens também ficam no campo JSON `images` e nas alternativas: confere em memória.
  const all = await prisma.bankQuestion.findMany({ where: { origin: "prova_oficial" }, select: { id: true, year: true, number: true, images: true, options: true, _count: { select: { answers: true } } } });
  const extra = all.filter((row) => JSON.stringify([row.images, row.options]).includes("broken-image"));
  const targets = new Map([...broken, ...extra].map((row) => [row.id, row]));
  let removed = 0;
  let hidden = 0;
  for (const row of targets.values()) {
    if (row._count.answers === 0) {
      await prisma.bankQuestion.delete({ where: { id: row.id } });
      removed += 1;
    } else {
      await prisma.bankQuestion.update({ where: { id: row.id }, data: { isPublished: false } });
      hidden += 1;
    }
    console.log(`questão ${row.year} Q${row.number}: imagem quebrada na fonte`);
  }
  console.log(`\n${removed} removidas, ${hidden} despublicadas (já tinham respostas).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
