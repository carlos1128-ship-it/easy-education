import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export function verifyCaktoWebhookSignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowMs?: number;
}) {
  const { rawBody, timestamp, signature, secret, nowMs = Date.now() } = input;
  if (!timestamp || !signature || !secret || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = `v1=${createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex")}`;
  return signature.split(",").some((candidate) => {
    const left = Buffer.from(candidate.trim());
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export type CaktoWebhookPayload = {
  secret?: unknown;
  event?: unknown;
  data?: unknown;
};

export function caktoWebhookItems(data: unknown) {
  return Array.isArray(data) ? data : [data];
}
