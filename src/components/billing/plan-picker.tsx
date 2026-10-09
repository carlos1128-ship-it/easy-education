"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { landingPlans } from "@/content/landing";
import { readApiJson } from "@/lib/client-response";
import { planHighlights, pricePerDayLabel } from "@/lib/plan-comparison";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

type Plan = "free" | "basic" | "full";

/**
 * Escolha entre os três planos logo depois do cadastro. Gratuito segue para o app; Básico e Completo vão para
 * o pagamento seguro do Stripe. Os números vêm de src/lib/plans.ts.
 */
export function PlanPicker({ initialPlan, freeHref, trial = false }: { initialPlan: Plan; freeHref: string; trial?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Plan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const p = landingPlans;

  async function handleCheckout() {
    if (loading) return;
    setLoading(true);
    if (selected === "free") {
      router.push(freeHref);
      return;
    }
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await readApiJson<{ url?: string; error?: string }>(response, "Não foi possível abrir o pagamento.");
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível abrir o pagamento.");
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="radiogroup" aria-label="Planos" className="grid gap-4 md:grid-cols-3">
        {(["free", "basic", "full"] as const).map((tier) => {
          const plan = p[tier];
          const active = selected === tier;
          const perDay = pricePerDayLabel(tier);
          return (
            <button
              key={tier}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(tier)}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl bg-surface p-5 text-left transition-colors",
                active ? "border-2 border-brand shadow-pop" : "border border-border hover:border-border-strong",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xl font-bold text-ink">{plan.name}</span>
                  <span className="text-sm text-ink-muted">{plan.description}</span>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 flex-none place-items-center rounded-full border-2",
                    active ? "border-brand bg-brand text-on-brand" : "border-border-strong",
                  )}
                >
                  {active ? <Check size={14} strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-[-0.5px] text-ink">{plan.price}</span>
                <span className="text-ink-muted">{plan.period}</span>
              </div>
              <span className="text-sm font-medium text-brand-strong">{perDay ?? "Sem cartão de crédito"}</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {planHighlights(tier).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink">
                    <Check size={15} className="mt-0.5 flex-none text-brand-strong" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              {"badge" in plan ? (
                <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-on-brand">{plan.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-surface-muted p-4">
        <p className="m-0 text-[13px] font-medium uppercase tracking-[0.4px] text-ink-muted">{p.includedTitle}</p>
        <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
          {p.included.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink">
              <Check size={16} className="mt-0.5 flex-none text-brand-strong" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60 dark:bg-[#2563eb] dark:text-white dark:hover:bg-[#1d4ed8]"
      >
        {selected === "free"
          ? loading
            ? "Abrindo..."
            : "Começar no plano Gratuito"
          : loading
            ? "Abrindo pagamento..."
            : trial
              ? `Testar o ${PLANS[selected].name} por 7 dias grátis`
              : `Assinar o ${PLANS[selected].name} por ${p[selected].price}/mês`}
      </button>
      <p className="m-0 flex items-center justify-center gap-2 text-center text-sm text-ink-muted">
        <ShieldCheck size={16} className="flex-none" aria-hidden="true" />
        {selected === "free"
          ? "Você pode testar um plano pago quando quiser, em Assinatura."
          : trial
            ? `Depois do teste, ${p[selected].price}/mês no cartão. Cancele antes do fim e não paga nada. Pagamento seguro pelo Stripe.`
            : <>Pagamento seguro pelo Stripe. {p.guarantee}</>}
      </p>
    </div>
  );
}
