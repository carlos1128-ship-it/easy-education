import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { TRIAL_DAYS, type PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getPriceForPlan, getStripe, PLANS, planFromPrice, type PlanId } from "@/lib/stripe";

/** Status do Stripe que dão direito ao plano pago. `past_due`: o Stripe ainda está tentando cobrar de novo. */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Dias da garantia (direito de arrependimento) contados a partir do primeiro pagamento. */
export const GUARANTEE_DAYS = 7;

/** Teste grátis (src/lib/plans.ts), uma vez por aluno. Reexportado para quem já importava daqui. */
export { TRIAL_DAYS };

/** O aluno ainda pode usar o teste grátis? Só quem nunca teve assinatura (nem teste) no Stripe. */
export async function isTrialEligible(userId: string) {
  const subscription = await getSubscriptionForUser(userId);
  return !subscription?.stripeSubscriptionId && !subscription?.firstPaidAt;
}

export class BillingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Os limites dos planos sempre valem. `BILLING_REQUIRED=false` é o modo aberto (só para desenvolvimento):
 * todo mundo usa o plano Completo.
 */
export function isBillingEnforced() {
  return process.env.BILLING_REQUIRED !== "false";
}

/** E-mails liberados sem assinatura (equipe, contas de teste). Lista separada por vírgula. */
function isExemptEmail(email?: string | null) {
  if (!email) return false;
  const exempt = (process.env.BILLING_EXEMPT_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return exempt.includes(email.toLowerCase());
}

export function subscriptionGivesAccess(status?: string | null) {
  return Boolean(status && ACCESS_STATUSES.has(status));
}

export async function getSubscriptionForUser(userId: string) {
  return getPrisma().subscription.findUnique({ where: { userId } });
}

/** Assinatura (ou teste grátis) em vigor: o aluno usa o app com os limites do plano. */
export type PaidAccess = {
  hasAccess: true;
  /** Plano em vigor, que define os limites de uso. */
  tier: PlanTier;
  plan: PlanId;
  /** Estado da assinatura no Stripe (`trialing` no teste grátis, `exempt` para a equipe). */
  status: string;
  isPaid: true;
  /** Está nos dias grátis. */
  trialing: boolean;
};

/** Sem assinatura nem teste em vigor: não há plano gratuito, então o app manda para /assinar. */
export type NoAccess = { hasAccess: false; tier: null; plan: null; status: string; isPaid: false; trialing: false };

export type AccessState = PaidAccess | NoAccess;

/** Diz se o aluno tem assinatura (ou teste) em vigor e com qual plano. */
export async function getAccessState(user: Pick<User, "id" | "email">): Promise<AccessState> {
  if (!isBillingEnforced() || isExemptEmail(user.email)) {
    return { hasAccess: true, tier: "full", plan: "full", status: "exempt", isPaid: true, trialing: false };
  }
  const subscription = await getSubscriptionForUser(user.id);
  const status = subscription?.status ?? "none";
  const plan = subscription?.plan === "basic" || subscription?.plan === "full" ? subscription.plan : null;
  if (plan && subscriptionGivesAccess(status)) return { hasAccess: true, tier: plan, plan, status, isPaid: true, trialing: status === "trialing" };
  return { hasAccess: false, tier: null, plan: null, status, isPaid: false, trialing: false };
}

/** Cliente Stripe do aluno; cria na primeira vez (com chave de idempotência contra cliques duplos). */
export async function getOrCreateStripeCustomer(user: Pick<User, "id" | "email" | "user_metadata">) {
  const prisma = getPrisma();
  const existing = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (existing) return existing.stripeCustomerId;

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const name = profile?.name ?? (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined);
  const customer = await getStripe().customers.create(
    {
      email: user.email ?? profile?.email ?? undefined,
      name,
      preferred_locales: ["pt-BR"],
      metadata: { userId: user.id },
    },
    { idempotencyKey: `customer-${user.id}` },
  );

  const row = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, stripeCustomerId: customer.id },
  });
  return row.stripeCustomerId;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof value === "string" ? value : value.id;
}

/**
 * Copia o estado da assinatura do Stripe para o banco. Sempre relê do Stripe,
 * então pode rodar quantas vezes for preciso e em qualquer ordem de eventos.
 */
export async function syncSubscription(subscriptionOrId: string | Stripe.Subscription) {
  const stripe = getStripe();
  const prisma = getPrisma();
  const subscription =
    typeof subscriptionOrId === "string" ? await stripe.subscriptions.retrieve(subscriptionOrId) : subscriptionOrId;
  const stripeCustomerId = customerId(subscription.customer);

  let row = await prisma.subscription.findUnique({ where: { stripeCustomerId } });
  if (!row && subscription.metadata?.userId) {
    const profile = await prisma.profile.findUnique({ where: { userId: subscription.metadata.userId } });
    if (profile) {
      row = await prisma.subscription.upsert({
        where: { userId: profile.userId },
        update: { stripeCustomerId },
        create: { userId: profile.userId, stripeCustomerId },
      });
    }
  }
  if (!row) return null;

  // Assinatura antiga encerrada não pode sobrescrever uma nova que já está ativa.
  if (
    row.stripeSubscriptionId &&
    row.stripeSubscriptionId !== subscription.id &&
    subscriptionGivesAccess(row.status) &&
    !subscriptionGivesAccess(subscription.status)
  ) {
    return row;
  }

  const item = subscription.items.data[0];
  const plan = planFromPrice(item?.price);
  return prisma.subscription.update({
    where: { id: row.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? null,
      plan,
      status: subscription.status,
      currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || Boolean(subscription.cancel_at),
    },
  });
}

/** Marca a data do primeiro pagamento (início da garantia de 7 dias). */
export async function markFirstPayment(stripeCustomerId: string, paidAt: Date) {
  await getPrisma().subscription.updateMany({
    where: { stripeCustomerId, firstPaidAt: null },
    data: { firstPaidAt: paidAt },
  });
}

/** Cria a sessão de pagamento do Stripe Checkout para o plano escolhido. */
export async function createCheckoutSession(
  user: Pick<User, "id" | "email" | "user_metadata">,
  plan: PlanId,
  origin: string,
) {
  const stripe = getStripe();
  const trial = await isTrialEligible(user.id);
  const customer = await getOrCreateStripeCustomer(user);
  const price = await getPriceForPlan(plan);
  // Trava de segurança: o app nunca cobra um valor diferente do que mostra (plans.ts).
  if (price.unit_amount !== PLANS[plan].priceCents) {
    throw new BillingError("O preço deste plano está sendo atualizado. Tente novamente em alguns minutos.", 503);
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    locale: "pt-BR",
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    customer_update: { name: "auto", address: "auto" },
    payment_method_collection: "always",
    subscription_data: {
      metadata: { userId: user.id, plan },
      // 7 dias grátis na primeira assinatura; sem cartão válido no fim do teste, a assinatura é cancelada.
      ...(trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } } : {}),
    },
    metadata: { userId: user.id, plan },
    success_url: `${origin}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/assinar?plano=${plan === "full" ? "completo" : "basico"}&cancelado=1`,
  });
}

/** Portal do Stripe: trocar cartão, mudar de plano, cancelar e ver faturas. */
export async function createPortalSession(userId: string, origin: string) {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) throw new BillingError("Você ainda não tem uma assinatura.", 404);
  return getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/dashboard/assinatura`,
    locale: "pt-BR",
  });
}

/** Confirma o retorno do checkout sem esperar o webhook (útil em dev e se o webhook atrasar). */
export async function confirmCheckoutSession(sessionId: string, userId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId) throw new BillingError("Sessão de pagamento inválida.", 403);
  if (session.subscription) {
    await syncSubscription(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
  }
  if (session.payment_status === "paid" && session.customer) {
    await markFirstPayment(customerId(session.customer), new Date(session.created * 1000));
  }
  return session;
}

export function guaranteeDeadline(firstPaidAt: Date | null) {
  return firstPaidAt ? new Date(firstPaidAt.getTime() + GUARANTEE_DAYS * 24 * 60 * 60 * 1000) : null;
}

export function isGuaranteeEligible(subscription: { firstPaidAt: Date | null; refundedAt: Date | null; status: string } | null) {
  if (!subscription || subscription.refundedAt) return false;
  const deadline = guaranteeDeadline(subscription.firstPaidAt);
  return Boolean(deadline && deadline > new Date() && subscriptionGivesAccess(subscription.status));
}

/**
 * Garantia de 7 dias: devolve tudo o que foi pago nessa assinatura e encerra na hora.
 * O reembolso vai para o mesmo cartão/meio usado no pagamento.
 */
export async function refundWithinGuarantee(userId: string) {
  const prisma = getPrisma();
  const stripe = getStripe();
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription?.stripeSubscriptionId || !isGuaranteeEligible(subscription)) {
    throw new BillingError(`O reembolso da garantia vale só nos ${GUARANTEE_DAYS} primeiros dias após o primeiro pagamento.`, 400);
  }

  const invoices = await stripe.invoices.list({
    subscription: subscription.stripeSubscriptionId,
    status: "paid",
    limit: 10,
    expand: ["data.payments"],
  });

  let refunded = 0;
  for (const invoice of invoices.data) {
    for (const invoicePayment of invoice.payments?.data ?? []) {
      if (invoicePayment.status !== "paid") continue;
      const paymentIntent = invoicePayment.payment.payment_intent;
      const charge = invoicePayment.payment.charge;
      const target = paymentIntent
        ? { payment_intent: typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id }
        : charge
          ? { charge: typeof charge === "string" ? charge : charge.id }
          : null;
      if (!target) continue;
      try {
        await stripe.refunds.create(
          { ...target, reason: "requested_by_customer", metadata: { userId, motivo: "garantia_7_dias" } },
          { idempotencyKey: `guarantee-${invoicePayment.id}` },
        );
        refunded += 1;
      } catch (error) {
        // Já reembolsado antes (ex.: clique duplo): segue para encerrar a assinatura.
        if (!(error instanceof Error && error.message.toLowerCase().includes("already been refunded"))) throw error;
      }
    }
  }

  const canceled = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
    cancellation_details: { comment: "Garantia de 7 dias" },
  });
  await syncSubscription(canceled);
  await prisma.subscription.update({ where: { userId }, data: { refundedAt: new Date() } });
  return { refunded };
}

export function planName(plan?: string | null) {
  return plan === "basic" || plan === "full" ? PLANS[plan].name : null;
}
