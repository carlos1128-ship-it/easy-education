import type { User } from "@supabase/supabase-js";
import { isTrialEligible } from "@/lib/billing";
import { TRIAL_DAYS } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { PLANS, type PlanId } from "@/lib/stripe";
import { caktoCheckoutUrl, caktoOfferId, createCaktoCallbackToken, getCaktoOffer } from "@/lib/cakto";
import { BillingError } from "@/lib/billing";
import { caktoApiRequest } from "@/lib/cakto";

export async function createCaktoCheckout(user: Pick<User, "id">, plan: PlanId) {
  const trial = await isTrialEligible(user.id);
  const offerId = caktoOfferId(plan, trial);
  let offer;
  try {
    offer = await getCaktoOffer(offerId);
  } catch {
    throw new BillingError("Não foi possível validar a oferta de pagamento da Cakto.", 503);
  }
  if (
    offer.id !== offerId ||
    offer.status !== "active" ||
    offer.type !== "subscription" ||
    offer.currency !== "BRL" ||
    offer.intervalType !== "month" ||
    offer.interval !== 1 ||
    offer.recurrence_period !== 30 ||
    offer.quantity_recurrences !== -1 ||
    Math.round(offer.price * 100) !== PLANS[plan].priceCents ||
    offer.trial_days !== (trial ? TRIAL_DAYS : 0)
  ) {
    throw new BillingError("A oferta Cakto não corresponde ao preço, recorrência ou teste grátis configurado no app.", 503);
  }

  const callback = createCaktoCallbackToken();
  await getPrisma().caktoCheckoutAttempt.create({
    data: { id: callback, userId: user.id, plan, offerId, expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  return { url: caktoCheckoutUrl(offerId, callback) };
}

export async function cancelCaktoSubscription(userId: string) {
  const prisma = getPrisma();
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (subscription?.provider !== "cakto" || !subscription.caktoSubscriptionId) {
    throw new BillingError("Não foi possível localizar uma assinatura Cakto ativa.", 404);
  }
  if (subscription.status === "canceled") throw new BillingError("Esta assinatura já foi cancelada.", 409);

  await caktoApiRequest(`/subscriptions/${encodeURIComponent(subscription.caktoSubscriptionId)}/cancel/`, { method: "POST" });
  await prisma.subscription.update({ where: { userId }, data: { status: "canceled", cancelAtPeriodEnd: false } });
}
