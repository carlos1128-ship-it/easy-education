/**
 * Apaga as contas criadas pela bateria de testes (scripts/qa/battery.ts) e tudo o que elas geraram.
 * Só mexe em contas de e-mail @easyeducation.test listadas em scripts/qa/.qa-accounts.local.json.
 *
 *   npx tsx --env-file=.env.local scripts/qa/cleanup.ts            (mostra o que seria apagado)
 *   npx tsx --env-file=.env.local scripts/qa/cleanup.ts --confirm  (apaga)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const FILE = "scripts/qa/.qa-accounts.local.json";

async function main() {
  if (!existsSync(FILE)) return console.log("Nenhuma conta de teste registrada.");
  const accounts: Array<{ email: string; userId: string }> = JSON.parse(readFileSync(FILE, "utf8"));
  const targets = accounts.filter((account) => account.email.endsWith("@easyeducation.test"));
  const confirm = process.argv.includes("--confirm");
  const prisma = getPrisma();
  for (const { email, userId } of targets) {
    const quizzes = await prisma.quiz.count({ where: { userId } });
    console.log(`${email}: ${quizzes} quizzes/simulados${confirm ? " → apagando" : ""}`);
    if (!confirm) continue;
    await prisma.$transaction([
      prisma.quiz.deleteMany({ where: { userId } }),
      prisma.flashcardDeck.deleteMany({ where: { userId } }),
      prisma.studySession.deleteMany({ where: { userId } }),
      prisma.studyPlan.deleteMany({ where: { userId } }),
      prisma.essay.deleteMany({ where: { userId } }),
      prisma.chatMessage.deleteMany({ where: { userId } }),
      prisma.usageEvent.deleteMany({ where: { userId } }),
      prisma.aiCallLog.updateMany({ where: { userId }, data: { userId: null } }),
      prisma.sharedQuestionUse.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      // As tabelas com onDelete: Cascade (blocos, anotações, resumos, sessões e respostas do banco) saem junto.
      prisma.profile.deleteMany({ where: { userId } }),
    ]);
    await createSupabaseAdminClient().auth.admin.deleteUser(userId).catch(() => null);
  }
  if (confirm) writeFileSync(FILE, JSON.stringify(accounts.filter((account) => !targets.includes(account)), null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
