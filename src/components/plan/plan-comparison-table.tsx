import { Check, Lock } from "lucide-react";
import { comparisonRows } from "@/lib/plan-comparison";
import { PLANS, PLAN_ORDER, planPriceLabel, type PlanTier } from "@/lib/plans";
import { cn } from "@/lib/utils";

function Cell({ value }: { value: string | null }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <Lock size={14} aria-hidden="true" />
        <span>Não incluso</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-start gap-1.5 text-ink">
      <Check size={14} className="mt-0.5 flex-none text-brand-strong" aria-hidden="true" />
      <span>{value}</span>
    </span>
  );
}

/**
 * Tabela comparativa dos três planos. Os números vêm de src/lib/plans.ts.
 * No celular vira uma lista por plano, para não precisar rolar para o lado.
 */
export function PlanComparisonTable({ current, className }: { current?: PlanTier; className?: string }) {
  const rows = comparisonRows();

  return (
    <div className={className}>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Comparação dos planos Gratuito, Básico e Completo</caption>
          <thead>
            <tr className="bg-surface-muted">
              <th scope="col" className="w-[34%] px-4 py-4 font-semibold text-ink">
                Recurso
              </th>
              {PLAN_ORDER.map((tier) => (
                <th key={tier} scope="col" className={cn("px-4 py-4 align-bottom", current === tier && "bg-brand-tint")}>
                  <span className="block text-base font-bold text-ink">{PLANS[tier].name}</span>
                  <span className="block text-[13px] font-medium text-ink-muted">
                    {planPriceLabel(tier)}
                    {PLANS[tier].priceCents > 0 ? "/mês" : ""}
                    {current === tier ? " · seu plano" : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <th scope="row" className="px-4 py-3 font-medium text-ink">
                  {row.label}
                </th>
                {PLAN_ORDER.map((tier) => (
                  <td key={tier} className={cn("px-4 py-3 align-top", current === tier && "bg-brand-tint/40")}>
                    <Cell value={row.values[tier]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {PLAN_ORDER.map((tier) => (
          <section key={tier} className={cn("rounded-2xl border bg-surface p-4", current === tier ? "border-brand" : "border-border")}>
            <h3 className="m-0 text-base font-bold text-ink">
              {PLANS[tier].name} · {planPriceLabel(tier)}
              {PLANS[tier].priceCents > 0 ? "/mês" : ""}
              {current === tier ? " (seu plano)" : ""}
            </h3>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0 text-sm">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-0.5">
                  <span className="text-[13px] text-ink-muted">{row.label}</span>
                  <Cell value={row.values[tier]} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
