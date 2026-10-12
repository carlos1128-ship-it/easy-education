import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { cancelCaktoSubscription } from "@/lib/cakto-billing";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`billing-cancel:${user.id}`, 3, 60_000).ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    }
    await cancelCaktoSubscription(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "billing.cakto.cancel", fallback: "Não foi possível cancelar a assinatura." });
  }
}
