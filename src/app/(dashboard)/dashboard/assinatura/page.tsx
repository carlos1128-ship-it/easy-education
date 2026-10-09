import Link from "next/link";
import { CalendarClock, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { GuaranteeRefundButton, ManageSubscriptionButton } from "@/components/billing/subscription-actions";
import { PlanComparisonTable } from "@/components/plan/plan-comparison-table";
import { getSubscriptionForUser, guaranteeDeadline, isGuaranteeEligible } from "@/lib/billing";
import { FEATURES, FEATURE_KEYS, PLANS, nextTier, planPriceLabel } from "@/lib/plans";
import { getStudentOrRedirect } from "@/lib/server-user";
import { describeReset } from "@/lib/time-window";
import { getUsageSnapshot } from "@/lib/usage";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: "Ativa", tone: "bg-success-tint text-success" },
  trialing: { label: "Em teste", tone: "bg-brand-tint text-brand-strong" },
  past_due: { label: "Pagamento pendente", tone: "bg-warning-tint text-warning" },
  exempt: { label: "Liberada", tone: "bg-brand-tint text-brand-strong" },
  none: { label: "Plano gratuito", tone: "bg-surface-muted text-ink" },
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function AssinaturaPage() {
  const { user, access } = await getStudentOrRedirect();
  const [subscription, usage] = await Promise.all([getSubscriptionForUser(user.id), getUsageSnapshot(user, { tier: access.tier })]);
  const status = STATUS_LABEL[access.isPaid ? access.status : "none"] ?? { label: access.status, tone: "bg-surface-muted text-ink" };
  const plan = PLANS[access.tier];
  const deadline = guaranteeDeadline(subscription?.firstPaidAt ?? null);
  const hasStripe = Boolean(subscription?.stripeSubscriptionId) && access.isPaid && access.status !== "exempt";
  const upgrade = nextTier(access.tier);
  const features = FEATURE_KEYS.map((feature) => usage.features[feature]);
  const limited = features.filter((item) => item.state === "limit");
  const locked = features.filter((item) => item.state === "locked");

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Assinatura</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Seu plano</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">Plano {plan.name}</h2>
                <p className="text-sm text-ink-muted">{plan.priceCents > 0 ? `${planPriceLabel(access.tier)} por mês` : "Sem custo, sem cartão"}</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.tone}`}>{status.label}</span>
          </div>

          {subscription?.currentPeriodEnd && access.isPaid ? (
            <p className="mt-6 flex items-center gap-2 text-ink">
              <CalendarClock size={18} className="text-ink-muted" aria-hidden="true" />
              {subscription.cancelAtPeriodEnd
                ? `Cancelada. Seu acesso vai até ${dateFormat.format(subscription.currentPeriodEnd)}.`
                : `Próxima cobrança em ${dateFormat.format(subscription.currentPeriodEnd)}.`}
            </p>
          ) : null}
          {access.status === "past_due" ? (
            <p className="mt-3 rounded-xl bg-warning-tint px-4 py-3 text-sm text-ink">
              Não conseguimos cobrar seu cartão. Atualize a forma de pagamento para não perder o acesso.
            </p>
          ) : null}

          {hasStripe ? (
            <>
              <div className="mt-6 flex flex-wrap gap-3">
                <ManageSubscriptionButton />
                <ManageSubscriptionButton variant="secondary" label={access.tier === "basic" ? "Mudar para o Completo" : "Mudar de plano"} />
              </div>
              <p className="mt-4 text-sm text-ink-muted">No portal seguro do Stripe você troca o cartão, muda de plano, cancela e baixa as faturas.</p>
            </>
          ) : access.status === "exempt" ? (
            <p className="mt-6 text-sm text-ink-muted">Sua conta tem acesso liberado pela equipe Easy Education.</p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={`/assinar?plano=${upgrade === "full" ? "completo" : "basico"}`}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong"
              >
                Ver o plano {upgrade ? PLANS[upgrade].name : ""}
              </Link>
              <span className="text-sm text-ink-muted">Pagamento seguro pelo Stripe. Cancele quando quiser.</span>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="size-5 text-brand-strong" />
              <h2 className="font-bold text-ink">Garantia de 7 dias</h2>
            </div>
            {isGuaranteeEligible(subscription) && deadline ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-muted">Não gostou? Até {dateFormat.format(deadline)} você cancela e recebe todo o dinheiro de volta.</p>
                <GuaranteeRefundButton deadline={dateFormat.format(deadline)} />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                {subscription?.refundedAt
                  ? "O reembolso da garantia já foi feito nesta conta."
                  : "Nos planos pagos, a garantia vale nos 7 primeiros dias após o primeiro pagamento. Depois disso, você pode cancelar quando quiser e usa até o fim do período pago."}
              </p>
            )}
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="m-0 text-lg font-bold text-ink">Seu uso no plano {plan.name}</h2>
        <p className="m-0 mt-1 text-sm text-ink-muted">Os limites diários voltam à meia-noite e os semanais, na segunda-feira (horário de Brasília).</p>
        <ul className="m-0 mt-4 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {limited.map((item) => {
            const meta = FEATURES[item.feature];
            const percent = item.max ? Math.min(100, Math.round((item.used / item.max) * 100)) : 0;
            return (
              <li key={item.feature} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">{meta.label}</span>
                  <span className="text-ink-muted">
                    {item.remaining === 0 ? "Acabou" : item.window === "day" ? "Hoje" : "Esta semana"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={item.used} aria-valuemin={0} aria-valuemax={item.max ?? 0}>
                  <div className={`h-full rounded-full ${percent >= 100 ? "bg-warning" : "bg-brand"}`} style={{ width: `${percent}%` }} />
                </div>
                {item.remaining === 0 && item.window ? <span className="text-xs text-warning">Volta {describeReset(item.window)}.</span> : null}
              </li>
            );
          })}
        </ul>
        {locked.length ? (
          <p className="m-0 mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
            <Lock size={14} aria-hidden="true" />
            Não incluso neste plano: {locked.map((item) => FEATURES[item.feature].label).join(", ")}.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Compare os planos</h2>
        <PlanComparisonTable current={access.tier} />
      </section>
    </div>
  );
}
