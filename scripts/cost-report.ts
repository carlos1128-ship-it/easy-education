/**
 * Custo real de IA por aluno, a partir de ai_call_logs (cada chamada ao Gemini grava tokens e custo estimado).
 * Responde: quanto custa o aluno médio, o que mais usa e o que ninguém usa, por plano e por recurso.
 * Alimenta o CFO (founder/numbers.json) no lugar do teto de uso justo.
 *
 *   npx tsx --env-file=.env.local scripts/cost-report.ts              (últimos 30 dias)
 *   npx tsx --env-file=.env.local scripts/cost-report.ts --days 7
 *
 * Chamadas sem aluno (userId nulo: geração em lote, scripts) aparecem à parte, para não inflar o custo por aluno.
 * Dólar fixo em R$ 5,76 (o mesmo dos tetos de src/lib/plans.ts: US$ 0,85 = R$ 4,90).
 */
import { getPrisma } from "@/lib/prisma";

const USD_BRL = 5.76;

function arg(name: string, fallback: number) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? Number(process.argv[index + 1]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const brl = (usd: number) => `R$ ${(usd * USD_BRL).toFixed(2).replace(".", ",")}`;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

async function main() {
  const days = arg("days", 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prisma = getPrisma();
  const rows = await prisma.aiCallLog.findMany({ where: { createdAt: { gte: since } }, select: { userId: true, plan: true, feature: true, costUsd: true } });
  console.log(`Chamadas de IA nos últimos ${days} dias: ${rows.length}\n`);

  const noUser = rows.filter((row) => !row.userId);
  const withUser = rows.filter((row) => row.userId);
  const total = (list: typeof rows) => list.reduce((sum, row) => sum + Number(row.costUsd), 0);
  console.log(`Custo total: ${brl(total(rows))}  (de alunos: ${brl(total(withUser))}; sem aluno, lote e scripts: ${brl(total(noUser))})\n`);

  // Por aluno, dentro de cada plano em que ele estava na hora da chamada.
  const perUser = new Map<string, { plan: string; cost: number }>();
  for (const row of withUser) {
    const key = `${row.userId}|${row.plan ?? "?"}`;
    const current = perUser.get(key) ?? { plan: row.plan ?? "?", cost: 0 };
    current.cost += Number(row.costUsd);
    perUser.set(key, current);
  }
  const plans = [...new Set([...perUser.values()].map((item) => item.plan))].sort();
  console.log("Por plano (custo por aluno no período; a conta do mês é proporcional a 30 dias):");
  for (const plan of plans) {
    const costs = [...perUser.values()].filter((item) => item.plan === plan).map((item) => item.cost);
    const scale = 30 / days;
    console.log(
      `  ${plan.padEnd(6)} alunos: ${String(costs.length).padStart(3)} | média ${brl((costs.reduce((a, b) => a + b, 0) / costs.length) * scale)}/mês | mediana ${brl(median(costs) * scale)} | p90 ${brl(percentile(costs, 0.9) * scale)} | máximo ${brl(Math.max(...costs) * scale)}`,
    );
  }
  console.log("  Teto de uso justo do app: Básico R$ 4,90 e Completo R$ 14,90 por mês (src/lib/plans.ts).\n");

  const byFeature = new Map<string, number>();
  for (const row of rows) byFeature.set(row.feature ?? "(sem recurso)", (byFeature.get(row.feature ?? "(sem recurso)") ?? 0) + Number(row.costUsd));
  console.log("Por recurso:");
  for (const [feature, cost] of [...byFeature.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${feature.padEnd(24)} ${brl(cost)}`);

  const worst = [...perUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 5);
  console.log("\nOs 5 alunos que mais custaram (ids truncados):");
  for (const [key, item] of worst) console.log(`  ${key.slice(0, 8)}… plano ${item.plan}: ${brl(item.cost)} no período`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
