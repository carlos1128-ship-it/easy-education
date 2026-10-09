import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin";
import { FEATURES, PLANS, type FeatureKey, type PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Custo de IA · interno" };
export const dynamic = "force-dynamic";

/** Câmbio usado só para mostrar em reais (ajuste com USD_BRL no ambiente). */
const USD_BRL = Number(process.env.USD_BRL ?? 5.5);

type PlanRow = { plan: string | null; users: bigint; calls: bigint; cost: number | null; max_user: number | null; avg_user: number | null };
type UserRow = { user_id: string; plan: string | null; calls: bigint; cost: number };
type FeatureRow = { feature: string | null; calls: bigint; cost: number };

const brl = (usd: number | null | undefined) => `R$ ${((usd ?? 0) * USD_BRL).toFixed(2).replace(".", ",")}`;
const usd = (value: number | null | undefined) => `US$ ${(value ?? 0).toFixed(3)}`;

export default async function CustosPage() {
  await requireAdminPage();
  const prisma = getPrisma();

  // Mês corrente em horário de Brasília (as linhas de ai_call_logs ficam em UTC).
  const [byPlan, topUsers, byFeature, monthly] = await Promise.all([
    prisma.$queryRaw<PlanRow[]>`
      WITH per_user AS (
        SELECT COALESCE(plan, 'sem_aluno') AS plan, user_id, SUM(cost_usd)::float8 AS cost, COUNT(*) AS calls
        FROM ai_call_logs
        WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
        GROUP BY 1, 2
      )
      SELECT plan, COUNT(DISTINCT user_id) AS users, SUM(calls) AS calls, SUM(cost)::float8 AS cost,
             MAX(cost)::float8 AS max_user, AVG(cost)::float8 AS avg_user
      FROM per_user GROUP BY plan ORDER BY plan`,
    prisma.$queryRaw<UserRow[]>`
      SELECT user_id, MAX(plan) AS plan, COUNT(*) AS calls, SUM(cost_usd)::float8 AS cost
      FROM ai_call_logs
      WHERE user_id IS NOT NULL AND created_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
      GROUP BY user_id ORDER BY cost DESC LIMIT 15`,
    prisma.$queryRaw<FeatureRow[]>`
      SELECT feature, COUNT(*) AS calls, SUM(cost_usd)::float8 AS cost
      FROM ai_call_logs
      WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
      GROUP BY feature ORDER BY cost DESC`,
    prisma.$queryRaw<Array<{ month: string; cost: number }>>`
      SELECT to_char(date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') AS month, SUM(cost_usd)::float8 AS cost
      FROM ai_call_logs GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
  ]);

  const planName = (plan: string | null) => (plan && plan in PLANS ? PLANS[plan as PlanTier].name : plan === "sem_aluno" ? "Sem aluno (lotes e scripts)" : (plan ?? "—"));
  const price = (plan: string | null) => (plan && plan in PLANS ? PLANS[plan as PlanTier].priceCents / 100 : null);

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header>
        <p className="m-0 text-sm font-medium text-brand-strong">Interno</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Custo de IA por plano e por aluno</h1>
        <p className="m-0 mt-2 text-sm text-ink-muted">
          Mês corrente. Custo estimado a partir dos tokens de cada chamada (tabela <code>ai_call_logs</code>), com margem de 15% para pedidos-reserva. Câmbio usado: R$ {USD_BRL.toFixed(2).replace(".", ",")} por dólar.
        </p>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
        <h2 className="m-0 p-5 pb-2 text-lg font-bold text-ink">Por plano: quanto custa o aluno que mais usa?</h2>
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="text-[13px] text-ink-muted">
              <th className="px-5 py-2 font-medium">Plano</th>
              <th className="px-3 py-2 font-medium">Alunos</th>
              <th className="px-3 py-2 font-medium">Chamadas</th>
              <th className="px-3 py-2 font-medium">Custo total</th>
              <th className="px-3 py-2 font-medium">Média por aluno</th>
              <th className="px-3 py-2 font-medium">Aluno que mais usa</th>
              <th className="px-3 py-2 font-medium">Preço do plano</th>
            </tr>
          </thead>
          <tbody>
            {byPlan.map((row) => (
              <tr key={row.plan ?? "x"} className="border-t border-border">
                <td className="px-5 py-3 font-semibold text-ink">{planName(row.plan)}</td>
                <td className="px-3 py-3">{String(row.users)}</td>
                <td className="px-3 py-3">{String(row.calls)}</td>
                <td className="px-3 py-3">{brl(row.cost)} <span className="text-ink-muted">({usd(row.cost)})</span></td>
                <td className="px-3 py-3">{brl(row.avg_user)}</td>
                <td className="px-3 py-3 font-semibold">{brl(row.max_user)}</td>
                <td className="px-3 py-3 text-ink-muted">{price(row.plan) !== null ? `R$ ${price(row.plan)!.toFixed(2).replace(".", ",")}` : "—"}</td>
              </tr>
            ))}
            {byPlan.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-ink-muted">Ainda não há chamadas registradas neste mês.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
          <h2 className="m-0 p-5 pb-2 text-lg font-bold text-ink">Alunos que mais gastaram</h2>
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {topUsers.map((row) => (
                <tr key={row.user_id} className="border-t border-border">
                  <td className="px-5 py-2.5 font-mono text-[12px] text-ink-muted">{row.user_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2.5">{planName(row.plan)}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{String(row.calls)} chamadas</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{brl(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
          <h2 className="m-0 p-5 pb-2 text-lg font-bold text-ink">Por recurso</h2>
          <table className="w-full border-collapse text-left text-sm">
            <tbody>
              {byFeature.map((row) => (
                <tr key={row.feature ?? "x"} className="border-t border-border">
                  <td className="px-5 py-2.5 text-ink">{row.feature && row.feature in FEATURES ? FEATURES[row.feature as FeatureKey].label : (row.feature ?? "Sem recurso")}</td>
                  <td className="px-3 py-2.5 text-ink-muted">{String(row.calls)} chamadas</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{brl(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="m-0 text-lg font-bold text-ink">Meses anteriores</h2>
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-6 gap-y-1 p-0 text-sm text-ink">
          {monthly.map((row) => (
            <li key={row.month}>
              {row.month}: <strong>{brl(row.cost)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
