import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { createParentCheckout } from "@/lib/parent-payments";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashParentToken } from "@/lib/parent-payment-token";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const origin = new URL(request.url).origin;
    if (request.headers.get("origin") && request.headers.get("origin") !== origin) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    if (!checkRateLimit(`parent-checkout:${hashParentToken(token)}`, 10, 60_000).ok) return NextResponse.json({ error: "Aguarde um minuto e tente novamente." }, { status: 429 });
    return NextResponse.json(await createParentCheckout(token, origin), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error, { scope: "billing.parent-checkout", fallback: "Não foi possível abrir o pagamento." }); }
}
