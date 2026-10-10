"use client";

import { useState } from "react";
import { Check, CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { landingPlans } from "@/content/landing";
import { readApiJson } from "@/lib/client-response";
import { PAYMENT_METHODS, type PaymentMethodId } from "@/lib/payment-methods";
import { planHighlights, pricePerDayLabel } from "@/lib/plan-comparison";
import { PLANS, TRIAL_DAYS, type PlanTier } from "@/lib/plans";
import { cn } from "@/lib/utils";

const METHOD_ICON: Record<PaymentMethodId, typeof CreditCard> = { card: CreditCard, pix_automatico: QrCode };

/**
 * Escolha do plano logo depois do cadastro. Não existe plano gratuito: os dois planos começam com 7 dias grátis
 * (uma vez por aluno), com o pagamento autorizado no início. Os números vêm de src/lib/plans.ts.
 */
export function PlanPicker({ initialPlan, trial = false }: { initialPlan: PlanTier; trial?: boolean }) {
  const [selected, setSelected] = useState<PlanTier>(initialPlan);
  const [method, setMethod] = useState<PaymentMethodId>("card");
  const [loading, setLoading] = useState(false);
  const p = landingPlans;

  async function handleCheckout() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected, method }),
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
      <div role="radiogroup" aria-label="Planos" className="grid gap-4 md:grid-cols-2">
        {(["basic", "full"] as const).map((tier) => {
          const plan = p[tier];
          const active = selected === tier;
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
                  className={cn("grid size-6 flex-none place-items-center rounded-full border-2", active ? "border-brand bg-brand text-on-brand" : "border-border-strong")}
                >
                  {active ? <Check size={14} strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-[-0.5px] text-ink">{plan.price}</span>
                <span className="text-ink-muted">{plan.period}</span>
              </div>
              <span className="text-sm font-medium text-brand-strong">{trial ? `${TRIAL_DAYS} dias grátis, depois ${pricePerDayLabel(tier) ?? `${plan.price}/mês`}` : pricePerDayLabel(tier)}</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {planHighlights(tier).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink">
                    <Check size={15} className="mt-0.5 flex-none text-brand-strong" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              {"badge" in plan ? <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-on-brand">{plan.badge}</span> : null}
            </button>
          );
        })}
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-ink">Forma de pagamento</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_METHODS.map((item) => {
            const Icon = METHOD_ICON[item.id];
            const active = method === item.id;
            return (
              <label
                key={item.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-sm",
                  !item.available ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                  active ? "border-brand bg-brand-tint" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={item.id}
                  checked={active}
                  disabled={!item.available}
                  onChange={() => setMethod(item.id)}
                  className="accent-[var(--brand)]"
                />
                <Icon className="size-4 flex-none text-ink-muted" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-xs text-ink-muted">{item.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

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
        {loading
          ? "Abrindo pagamento..."
          : trial
            ? `Começar ${TRIAL_DAYS} dias grátis no ${PLANS[selected].name}`
            : `Assinar o ${PLANS[selected].name} por ${p[selected].price}/mês`}
      </button>
      <p className="m-0 flex items-center justify-center gap-2 text-center text-sm text-ink-muted">
        <ShieldCheck size={16} className="flex-none" aria-hidden="true" />
        {trial
          ? `Hoje você não paga nada. Depois dos ${TRIAL_DAYS} dias, ${p[selected].price}/mês. Cancele antes do fim e não paga nada. Pagamento seguro pelo Stripe.`
          : <>Pagamento seguro pelo Stripe. {p.guarantee}</>}
      </p>
    </div>
  );
}
