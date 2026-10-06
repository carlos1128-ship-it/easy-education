import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createPortalSession } from "@/lib/billing";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`portal:${user.id}`, 10, 60_000).ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    }
    const portal = await createPortalSession(user.id, new URL(request.url).origin);
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return apiErrorResponse(error, { scope: "billing.portal", fallback: "Não foi possível abrir o portal da assinatura." });
  }
}
