import { getPrisma } from "@/lib/prisma";
import { caktoWebhookItems } from "@/lib/cakto-webhook";
import { getCaktoSubscription } from "@/lib/cakto";
import { subscriptionGivesAccess } from "@/lib/billing";

type CaktoOrderEvent = {
  id?: unknown;
  status?: unknown;
  amount?: unknown;
  paidAt?: unknown;
  callback?: unknown;
  offer?: { id?: unknown } | null;
  customer?: { id?: unknown } | null;
  subscription?: { id?: unknown; status?: unknown } | null;
};

const ACTIVE_EVENTS = new Set(["purchase_approved", "subscription_created", "subscription_renewed", "subscription_resumed", "subscription_late_recovered"]);
const CANCELED_EVENTS = new Set(["subscription_canceled", "refund", "chargeback"]);

function providerStatus(event: string, order: CaktoOrderEvent) {
  if (ACTIVE_EVENTS.has(event) && (order.status === "paid" || order.subscription?.status === "trial" || (event === "subscription_resumed" && order.subscription?.status === "active"))) {
    return order.subscription?.status === "trial" ? "trialing" : "active";
  }
  if (event === "subscription_late" || event === "subscription_renewal_refused") return "past_due";
  if (event === "subscription_paused") return "paused";
  if (CANCELED_EVENTS.has(event)) return "canceled";
  return null;
}

function validString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Processa somente eventos assinados pelo provedor; o callback opaco liga a compra ao usuário autenticado. */
export async function processCaktoWebhookEvent(event: string, rawData: unknown, deliveryId?: string) {
  if (event === "checkout_abandonment") return { ignored: true };
  const prisma = getPrisma();
  let processed = 0;

  for (const item of caktoWebhookItems(rawData)) {
    if (!item || typeof item !== "object") continue;
    const order = item as CaktoOrderEvent;
    const status = providerStatus(event, order);
    if (!status || !validString(order.id)) continue;
    const orderId = order.id;

    const callback = validString(order.callback) ? order.callback : null;
    const subscriptionId = validString(order.subscription?.id) ? order.subscription.id : null;
    const attempt = callback
      ? await prisma.caktoCheckoutAttempt.findUnique({ where: { id: callback } })
      : null;
    if (attempt && order.offer?.id !== attempt.offerId) continue;
    const existing = subscriptionId
      ? await prisma.subscription.findUnique({ where: { caktoSubscriptionId: subscriptionId } })
      : await prisma.subscription.findUnique({ where: { caktoOrderId: orderId } });
    const userId = attempt?.userId ?? existing?.userId;
    if (!userId) throw new Error("Compra Cakto ainda sem vinculo com uma conta autenticada.");
    const current = existing ?? await prisma.subscription.findUnique({ where: { userId } });
    if (current?.refundedAt && ACTIVE_EVENTS.has(event) &&
      ((subscriptionId && current.caktoSubscriptionId === subscriptionId) || current.caktoOrderId === orderId || attempt?.completedAt)) continue;
    // Uma entrega atrasada nunca substitui outra assinatura que ja esta em uso.
    const currentHasAccess = current && subscriptionGivesAccess(current.status) &&
      (current.provider !== "cakto" || !current.currentPeriodEnd || current.currentPeriodEnd > new Date());
    if (currentHasAccess && (current.provider !== "cakto" || (current.caktoSubscriptionId && subscriptionId && current.caktoSubscriptionId !== subscriptionId))) continue;

    const remote = subscriptionId ? await getCaktoSubscription(subscriptionId) : null;
    const remoteStatuses: Record<string, string> = { active: "active", trial: "trialing", late: "past_due", paused: "paused", canceled: "canceled", expired: "canceled", inactive: "unpaid" };
    const effectiveStatus = event === "refund" || event === "chargeback" ? "canceled" : remote ? remoteStatuses[remote.status] : status;
    if (!effectiveStatus) throw new Error("Status de assinatura Cakto desconhecido.");
    if (order.status === "paid" && ACTIVE_EVENTS.has(event) && effectiveStatus === "unpaid") {
      throw new Error("A API Cakto ainda nao confirmou a ativacao da assinatura paga.");
    }
    const nextPayment = remote?.next_payment_date ? new Date(remote.next_payment_date) : null;
    const paymentDate = validString(order.paidAt) ? new Date(order.paidAt) : null;
    const paidAt = paymentDate && !Number.isNaN(paymentDate.getTime()) ? paymentDate : null;
    const currentPeriodEnd = nextPayment && !Number.isNaN(nextPayment.getTime())
      ? nextPayment
      : paidAt ? new Date(paidAt.getTime() + 30 * 24 * 60 * 60_000) : existing?.currentPeriodEnd ?? null;

    if ((effectiveStatus === "active" || effectiveStatus === "trialing") && !currentPeriodEnd) {
      throw new Error("Pagamento sem prazo de acesso confirmado.");
    }

    const eventId = deliveryId ?? `${event}:${orderId}`;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.caktoEvent.create({ data: { id: eventId, type: event } });
        const amount = typeof order.amount === "number" ? order.amount : Number(order.amount ?? 0);
        const isPaidOrder = order.status === "paid" && amount > 0 && Boolean(paidAt);
        const customerId = order.customer?.id === undefined || order.customer?.id === null ? null : String(order.customer.id);
        await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: null,
            caktoCustomerId: customerId,
            caktoSubscriptionId: subscriptionId,
            caktoOrderId: orderId,
            provider: "cakto",
            plan: attempt?.plan ?? existing?.plan ?? null,
            status: effectiveStatus,
            currentPeriodEnd,
            firstPaidAt: isPaidOrder ? paidAt : null,
            ...(event === "refund" || event === "chargeback" ? { refundedAt: new Date() } : {}),
          },
          update: {
            provider: "cakto",
            ...(customerId ? { caktoCustomerId: customerId } : {}),
            ...(subscriptionId ? { caktoSubscriptionId: subscriptionId } : {}),
            caktoOrderId: orderId,
            ...(attempt?.plan ? { plan: attempt.plan } : {}),
            status: effectiveStatus,
            currentPeriodEnd,
            ...(isPaidOrder ? { firstPaidAt: current?.firstPaidAt ?? paidAt } : {}),
            ...(isPaidOrder && current?.refundedAt && attempt && !attempt.completedAt ? { refundedAt: null } : {}),
            cancelAtPeriodEnd: false,
            ...(event === "refund" || event === "chargeback" ? { refundedAt: new Date() } : {}),
          },
        });
        if (attempt) {
          await tx.caktoCheckoutAttempt.update({
            where: { id: attempt.id },
            data: { orderId: attempt.orderId ?? orderId, ...((effectiveStatus === "active" || effectiveStatus === "trialing") ? { completedAt: attempt.completedAt ?? new Date() } : {}) },
          });
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002" && await prisma.caktoEvent.findUnique({ where: { id: eventId } })) continue;
      throw error;
    }
    processed += 1;
  }

  return { processed };
}
