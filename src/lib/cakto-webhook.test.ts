import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { caktoWebhookItems, verifyCaktoWebhookSignature } from "@/lib/cakto-webhook";

describe("webhook Cakto", () => {
  const secret = "segredo-local-de-teste";
  const rawBody = '{"event":"purchase_approved","data":{"id":"order-1"}}';
  const timestamp = "1791835200";
  const signature = `v1=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  const nowMs = Number(timestamp) * 1000;

  it("valida assinatura sobre o corpo cru dentro da janela de tolerância", () => {
    expect(verifyCaktoWebhookSignature({ rawBody, timestamp, signature, secret, nowMs })).toBe(true);
    expect(verifyCaktoWebhookSignature({ rawBody: `${rawBody} `, timestamp, signature, secret, nowMs })).toBe(false);
  });

  it("rejeita assinaturas expiradas e timestamps malformados", () => {
    expect(verifyCaktoWebhookSignature({ rawBody, timestamp, signature, secret, nowMs: nowMs + 6 * 60_000 })).toBe(false);
    expect(verifyCaktoWebhookSignature({ rawBody, timestamp: "agora", signature, secret, nowMs })).toBe(false);
  });

  it("normaliza tanto um pedido quanto o array V2 de pedidos", () => {
    const order = { id: "order-1" };
    expect(caktoWebhookItems(order)).toEqual([order]);
    expect(caktoWebhookItems([order])).toEqual([order]);
  });
});
