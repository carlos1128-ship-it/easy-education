import { after, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { enqueueCaktoWebhook, processCaktoDelivery } from "@/lib/cakto-inbox";
import { verifyCaktoWebhookSignature, type CaktoWebhookPayload } from "@/lib/cakto-webhook";
import { apiErrorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CAKTO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook Cakto não configurado." }, { status: 503 });

  const rawBody = await request.text();
  if (!verifyCaktoWebhookSignature({
    rawBody,
    timestamp: request.headers.get("x-cakto-timestamp"),
    signature: request.headers.get("x-cakto-signature"),
    secret,
  })) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  let payload: CaktoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as CaktoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (typeof payload.event !== "string" || !payload.event || payload.data === undefined) {
    return NextResponse.json({ error: "Evento Cakto incompleto." }, { status: 400 });
  }
  const receivedSecret = typeof payload.secret === "string" ? Buffer.from(payload.secret) : Buffer.alloc(0);
  const expectedSecret = Buffer.from(secret);
  if (receivedSecret.length !== expectedSecret.length || !timingSafeEqual(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Segredo do webhook inválido." }, { status: 401 });
  }

  try {
    const ids = await enqueueCaktoWebhook(payload.event, payload.data);
    after(async () => {
      for (const id of ids) await processCaktoDelivery(id);
    });
    return NextResponse.json({ received: true, queued: ids.length });
  } catch (error) {
    return apiErrorResponse(error, { scope: "cakto.webhook", fallback: "Falha ao processar evento." });
  }
}
