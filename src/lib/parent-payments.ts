import type Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { BillingError, getAccessState, markFirstPayment, subscriptionGivesAccess, syncSubscription } from "@/lib/billing";
import { checkoutBranding, getPriceForPlan, getStripe, isStripeTestMode, PLANS, type PlanId } from "@/lib/stripe";
import { getPrisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profile";
import { createParentToken, hashParentToken, parentLinkExpired, validParentToken } from "@/lib/parent-payment-token";

export async function createParentPaymentRequest(user: User, plan: PlanId, origin: string) {
  await ensureProfileForUser(user);
  const access = await getAccessState(user);
  if (access.isPaid) throw new BillingError("Seu acesso já está liberado.", 409);
  const token = createParentToken();
  await getPrisma().parentPaymentRequest.create({ data: { userId: user.id, plan, tokenHash: hashParentToken(token), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
  return { url: `${origin}/pais/${token}` };
}

export async function getParentPaymentRequest(token: string) {
  if (!validParentToken(token)) return null;
  const request = await getPrisma().parentPaymentRequest.findUnique({ where: { tokenHash: hashParentToken(token) }, include: { profile: { select: { name: true } } } });
  if (!request || parentLinkExpired(request.expiresAt)) return null;
  return request;
}

/** O usuário beneficiado vem exclusivamente do pedido salvo, nunca do navegador do pagador. */
export async function createParentCheckout(token: string, origin: string) {
  const request = await getParentPaymentRequest(token);
  if (!request) throw new BillingError("Este link expirou. Peça ao estudante um novo link.", 404);
  const stripe = getStripe();
  let openCheckoutUrl: string | null = null;
  if (request.stripeSessionId) {
    const previous = await stripe.checkout.sessions.retrieve(request.stripeSessionId);
    if (previous.status === "complete") {
      await completeParentPayment(previous);
      return { url: `${origin}/pais/${token}/sucesso?session_id=${previous.id}` };
    }
    if (previous.status === "open" && previous.url) openCheckoutUrl = previous.url;
  }
  const access = await getAccessState({ id: request.userId });
  if (request.completedAt || access.isPaid) throw new BillingError("O acesso deste estudante já está liberado.", 409);
  if (openCheckoutUrl) return { url: openCheckoutUrl };
  const plan = request.plan as PlanId;
  const price = await getPriceForPlan(plan);
  if (price.unit_amount !== PLANS[plan].priceCents || price.currency !== "brl" || price.recurring?.interval !== "month") throw new BillingError("O preço deste plano está sendo atualizado.", 503);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription", client_reference_id: request.userId,
    line_items: [{ price: price.id, quantity: 1 }], locale: "pt-BR",
    branding_settings: checkoutBranding(), allow_promotion_codes: true,
    subscription_data: { metadata: { userId: request.userId, plan, parentRequestId: request.id } },
    metadata: { userId: request.userId, plan, parentRequestId: request.id },
    custom_text: { submit: { message: "O acesso será liberado na conta do estudante. O responsável não precisa criar outra conta." } },
    success_url: `${origin}/pais/${token}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pais/${token}?cancelado=1`,
  }, { idempotencyKey: `parent-${request.id}-${request.stripeSessionId ?? "first"}` });
  if (!session.url) throw new BillingError("Não foi possível abrir o pagamento.", 503);
  await getPrisma().parentPaymentRequest.update({ where: { id: request.id }, data: { stripeSessionId: session.id } });
  return { url: session.url };
}

export async function completeParentPayment(session: Stripe.Checkout.Session) {
  const requestId = session.metadata?.parentRequestId;
  if (!requestId) return false;
  const request = await getPrisma().parentPaymentRequest.findUnique({ where: { id: requestId } });
  if (!request || request.stripeSessionId !== session.id || session.client_reference_id !== request.userId || session.metadata?.userId !== request.userId || session.metadata?.plan !== request.plan) throw new BillingError("Pagamento não corresponde ao pedido do estudante.", 403);
  if (session.livemode === isStripeTestMode()) throw new BillingError("Modo do pagamento inválido.", 400);
  if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status) || !session.subscription) return false;
  const subscription = await getStripe().subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
  if (subscription.metadata.userId !== request.userId || subscription.metadata.parentRequestId !== request.id || subscription.metadata.plan !== request.plan) throw new BillingError("Assinatura não corresponde ao estudante.", 403);
  const saved = await syncSubscription(subscription);
  if (!saved || saved.userId !== request.userId || saved.provider !== "stripe" || !subscriptionGivesAccess(saved.status)) return false;
  const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (customer) await markFirstPayment(customer, new Date(session.created * 1000));
  await getPrisma().parentPaymentRequest.updateMany({ where: { id: request.id, completedAt: null }, data: { completedAt: new Date() } });
  return true;
}

export async function confirmParentPayment(token: string, sessionId: string) {
  const request = await getParentPaymentRequest(token);
  if (!request || request.stripeSessionId !== sessionId || !/^cs_(test_)?[A-Za-z0-9]+$/.test(sessionId)) throw new BillingError("Sessão de pagamento inválida.", 403);
  return completeParentPayment(await getStripe().checkout.sessions.retrieve(sessionId));
}
