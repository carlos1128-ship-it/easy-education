import { getPrisma } from "@/lib/prisma";
async function main() {
  const since = new Date(Date.now() - 6 * 60_000);
  const rows = await getPrisma().aiCallLog.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 12, select: { createdAt: true, feature: true, userId: true, plan: true, model: true } });
  console.log(rows.map((r) => `${r.createdAt.toISOString().slice(11, 19)} ${r.feature ?? "-"} ${r.plan ?? "-"} ${r.userId ? "com aluno" : "SEM aluno"} ${r.model}`).join("\n"));
}
main();
