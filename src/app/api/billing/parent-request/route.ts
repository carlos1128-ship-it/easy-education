import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-error";
import { createParentPaymentRequest } from "@/lib/parent-payments";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const origin = new URL(request.url).origin;
    if (request.headers.get("origin") && request.headers.get("origin") !== origin) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    if (!checkRateLimit(`parent-request:${user.id}`, 10, 60_000).ok) return NextResponse.json({ error: "Aguarde um minuto antes de gerar outro link." }, { status: 429 });
    const { plan } = z.object({ plan: z.enum(["basic", "full"]) }).parse(await request.json());
    return NextResponse.json(await createParentPaymentRequest(user, plan, origin), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error, { scope: "billing.parent-request", fallback: "Não foi possível criar o link." }); }
}
