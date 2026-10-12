import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession, createPortalSession, getAccessState, getSubscriptionForUser } from "@/lib/billing";
import { createCaktoCheckout } from "@/lib/cakto-billing";
import { isCaktoConfigured } from "@/lib/cakto";
import { ensureProfileForUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/rate-limit";
import { availablePaymentMethod } from "@/lib/payment-methods";
import { isStripeConfigured } from "@/lib/stripe";

const checkoutSchema = z.object({ plan: z.enum(["basic", "full"]), method: z.enum(["card", "pix", "pix_automatico"]).default("card") });

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const provider = process.env.BILLING_PROVIDER?.trim().toLowerCase() || "stripe";
    if (provider !== "stripe" && provider !== "cakto") {
      return NextResponse.json({ error: "Provedor de pagamento inválido." }, { status: 503 });
    }
    if (provider === "stripe" && !isStripeConfigured()) {
      return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis." }, { status: 503 });
    }
    if (provider === "cakto" && !isCaktoConfigured()) {
      return NextResponse.json({ error: "A integração Cakto ainda não está configurada." }, { status: 503 });
    }
    if (!checkRateLimit(`checkout:${user.id}`, 10, 60_000).ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    }

    const { plan, method } = checkoutSchema.parse(await request.json());
    // A Cakto coleta a escolha do método no checkout hospedado.
    if (provider === "stripe" && !availablePaymentMethod(method)) {
      return NextResponse.json({ error: "Esta forma de pagamento não está disponível neste checkout." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    await ensureProfileForUser(user);

    // Já assinante: em vez de uma segunda assinatura, abre o portal para trocar de plano.
    const access = await getAccessState(user);
    if (access.isPaid && access.status !== "exempt") {
      const subscription = await getSubscriptionForUser(user.id);
      if (subscription?.provider === "cakto") {
        return NextResponse.json({ error: "Sua assinatura Cakto já está ativa. Para mudar ou cancelar o plano, fale com o suporte." }, { status: 409 });
      }
      const portal = await createPortalSession(user.id, origin);
      return NextResponse.json({ url: portal.url });
    }

    if (provider === "cakto") {
      const checkout = await createCaktoCheckout(user, plan);
      return NextResponse.json(checkout);
    }

    const session = await createCheckoutSession(user, plan, origin);
    if (!session.url) throw new Error("Checkout sem URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiErrorResponse(error, { scope: "billing.checkout", fallback: "Não foi possível abrir o pagamento." });
  }
}
