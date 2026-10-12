import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processCaktoWebhookEvent } from "@/lib/cakto-events";
import { verifyCaktoWebhookSignature, type CaktoWebhookPayload } from "@/lib/cakto-webhook";

export const runtime = "nodejs";

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
    const result = await processCaktoWebhookEvent(payload.event, payload.data);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error("[cakto.webhook] falha ao processar evento", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Falha ao processar evento." }, { status: 503 });
  }
}
