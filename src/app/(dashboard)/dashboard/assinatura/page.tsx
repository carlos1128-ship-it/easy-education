import { CalendarClock, CreditCard, ShieldCheck } from "lucide-react";
import { GuaranteeRefundButton, ManageSubscriptionButton } from "@/components/billing/subscription-actions";
import { getAccessState, getSubscriptionForUser, guaranteeDeadline, isGuaranteeEligible, planName } from "@/lib/billing";
import { getStudentOrRedirect } from "@/lib/server-user";
import { PLANS } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: { label: "Ativa", tone: "bg-success-tint text-success" },
  trialing: { label: "Em teste", tone: "bg-brand-tint text-brand-strong" },
  past_due: { label: "Pagamento pendente", tone: "bg-warning-tint text-warning" },
  exempt: { label: "Liberada", tone: "bg-brand-tint text-brand-strong" },
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function AssinaturaPage() {
  const { user } = await getStudentOrRedirect();
  const [access, subscription] = await Promise.all([getAccessState(user), getSubscriptionForUser(user.id)]);
  const status = STATUS_LABEL[access.status] ?? { label: access.status, tone: "bg-surface-muted text-ink" };
  const name = planName(subscription?.plan ?? access.plan) ?? "Completo";
  const price = subscription?.plan === "basic" ? PLANS.basic.price : PLANS.full.price;
  const deadline = guaranteeDeadline(subscription?.firstPaidAt ?? null);
  const hasStripe = Boolean(subscription?.stripeSubscriptionId);

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
                <h2 className="text-lg font-bold text-ink">Plano {name}</h2>
                {hasStripe ? <p className="text-sm text-ink-muted">{price} por mês</p> : null}
              </div>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.tone}`}>{status.label}</span>
          </div>

          {subscription?.currentPeriodEnd ? (
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
            <div className="mt-6 flex flex-wrap gap-3">
              <ManageSubscriptionButton />
              <ManageSubscriptionButton
                variant="secondary"
                label={subscription?.plan === "basic" ? "Mudar para o Completo" : "Mudar de plano"}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-ink-muted">Sua conta tem acesso liberado pela equipe Easy Education.</p>
          )}
          {hasStripe ? (
            <p className="mt-4 text-sm text-ink-muted">
              No portal seguro do Stripe você troca o cartão, muda de plano, cancela e baixa as faturas.
            </p>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="size-5 text-brand-strong" />
              <h2 className="font-bold text-ink">Garantia de 7 dias</h2>
            </div>
            {isGuaranteeEligible(subscription) && deadline ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-muted">
                  Não gostou? Até {dateFormat.format(deadline)} você cancela e recebe todo o dinheiro de volta.
                </p>
                <GuaranteeRefundButton deadline={dateFormat.format(deadline)} />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                {subscription?.refundedAt
                  ? "O reembolso da garantia já foi feito nesta conta."
                  : "A garantia vale nos 7 primeiros dias após o primeiro pagamento. Depois disso, você pode cancelar quando quiser e usa até o fim do período pago."}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
