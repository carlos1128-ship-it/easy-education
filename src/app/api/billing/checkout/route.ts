import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession, createPortalSession, getAccessState } from "@/lib/billing";
import { ensureProfileForUser } from "@/lib/profile";
import { checkRateLimit } from "@/lib/rate-limit";
import { availablePaymentMethod } from "@/lib/payment-methods";
import { isStripeConfigured } from "@/lib/stripe";

const checkoutSchema = z.object({ plan: z.enum(["basic", "full"]), method: z.enum(["card", "pix_automatico"]).default("card") });

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Pagamentos temporariamente indisponíveis." }, { status: 503 });
    }
    if (!checkRateLimit(`checkout:${user.id}`, 10, 60_000).ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    }

    const { plan, method } = checkoutSchema.parse(await request.json());
    // Hoje só o cartão (Stripe). O Pix Automático entra quando houver gateway (src/lib/payment-methods.ts).
    if (!availablePaymentMethod(method)) {
      return NextResponse.json({ error: "Pix Automático ainda não está disponível. Use o cartão por enquanto." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    await ensureProfileForUser(user);

    // Já assinante: em vez de uma segunda assinatura, abre o portal para trocar de plano.
    const access = await getAccessState(user);
    if (access.isPaid && access.status !== "exempt") {
      const portal = await createPortalSession(user.id, origin);
      return NextResponse.json({ url: portal.url });
    }

    const session = await createCheckoutSession(user, plan, origin);
    if (!session.url) throw new Error("Checkout sem URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiErrorResponse(error, { scope: "billing.checkout", fallback: "Não foi possível abrir o pagamento." });
  }
}
