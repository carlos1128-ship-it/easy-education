/**
 * Tira do ar as questões de provas SEM licença aberta (FUVEST, UNICAMP, UNESP, ETEC e FATEC).
 * Só despublica (is_published = false): nada é apagado, e dá para reverter com --republish.
 * Fica de pé só o que tem licença aberta (ENEM, CC BY-ND do INEP). Ver docs/fontes-questoes.md, ressalva 5.
 *
 *   npx tsx --env-file=.env.local scripts/bank/unpublish-non-open.ts            (só mostra o que mudaria)
 *   npx tsx --env-file=.env.local scripts/bank/unpublish-non-open.ts --apply    (despublica)
 *   npx tsx --env-file=.env.local scripts/bank/unpublish-non-open.ts --republish --apply   (desfaz)
 */
import { getPrisma } from "@/lib/prisma";

const NON_OPEN = ["fuvest", "unicamp", "unesp", "etec", "fatec"];

async function main() {
  const apply = process.argv.includes("--apply");
  const republish = process.argv.includes("--republish");
  const prisma = getPrisma();
  const from = !republish;

  const exams = await prisma.exam.findMany({ where: { slug: { in: NON_OPEN } }, select: { id: true, slug: true } });
  for (const exam of exams) {
    const count = await prisma.bankQuestion.count({ where: { examId: exam.id, isPublished: from } });
    console.log(`${exam.slug}: ${count} questões ${from ? "publicadas" : "despublicadas"}${apply ? "" : " (simulação)"}`);
    if (apply && count) await prisma.bankQuestion.updateMany({ where: { examId: exam.id, isPublished: from }, data: { isPublished: !from } });
  }

  const open = await prisma.bankQuestion.count({ where: { isPublished: true, exam: { slug: { notIn: NON_OPEN } } } });
  const still = await prisma.bankQuestion.count({ where: { isPublished: true, exam: { slug: { in: NON_OPEN } } } });
  console.log(`\nPublicadas de provas com licença aberta (ENEM): ${open}. Publicadas de provas sem licença: ${still}.`);
  if (!apply) console.log("Nada foi alterado. Rode com --apply.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
