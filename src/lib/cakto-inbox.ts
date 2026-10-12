import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { caktoWebhookItems } from "@/lib/cakto-webhook";
import { processCaktoWebhookEvent } from "@/lib/cakto-events";

function string(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export async function enqueueCaktoWebhook(event: string, data: unknown) {
  const ids: string[] = [];
  for (const item of caktoWebhookItems(data)) {
    if (!item || typeof item !== "object") continue;
    const order = item as { id?: unknown; callback?: unknown; subscription?: { id?: unknown } };
    const id = createHash("sha256").update(JSON.stringify({ event, item })).digest("hex");
    await getPrisma().caktoWebhookDelivery.upsert({
      where: { id },
      create: { id, event, data: item as Prisma.InputJsonValue, callback: string(order.callback), subscriptionId: string(order.subscription?.id), orderId: string(order.id) },
      update: {},
    });
    ids.push(id);
  }
  return ids;
}

export async function processCaktoDelivery(id: string) {
  const prisma = getPrisma();
  const delivery = await prisma.caktoWebhookDelivery.findUnique({ where: { id } });
  if (!delivery || delivery.processedAt) return;
  // Claim atomico evita duas execucoes simultaneas; o lease expira se a funcao cair.
  const claim = await prisma.caktoWebhookDelivery.updateMany({
    where: { id, processedAt: null, nextAttemptAt: { lte: new Date() } },
    data: { nextAttemptAt: new Date(Date.now() + 120_000), attempts: { increment: 1 } },
  });
  if (!claim.count) return;
  try {
    await processCaktoWebhookEvent(delivery.event, delivery.data, delivery.id);
    await prisma.caktoWebhookDelivery.update({ where: { id }, data: { processedAt: new Date(), data: Prisma.JsonNull } });
  } catch {
    // O payload assinado permanece no banco para nova tentativa, sem segredos nos logs.
    console.error("[cakto.inbox] confirmacao pendente", { id, event: delivery.event });
    await prisma.caktoWebhookDelivery.update({ where: { id }, data: { nextAttemptAt: new Date(Date.now() + Math.min(3600_000, 30_000 * 2 ** Math.min(delivery.attempts, 7))) } });
  }
}

export async function retryCaktoDeliveries(userId?: string) {
  const prisma = getPrisma();
  const where: Prisma.CaktoWebhookDeliveryWhereInput = { processedAt: null, nextAttemptAt: { lte: new Date() } };
  if (userId) {
    const [attempts, subscription] = await Promise.all([
      prisma.caktoCheckoutAttempt.findMany({ where: { userId }, select: { id: true } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);
    where.OR = [
      { callback: { in: attempts.map((attempt) => attempt.id) } },
      ...(subscription?.caktoSubscriptionId ? [{ subscriptionId: subscription.caktoSubscriptionId }] : []),
      ...(subscription?.caktoOrderId ? [{ orderId: subscription.caktoOrderId }] : []),
    ];
  }
  const deliveries = await prisma.caktoWebhookDelivery.findMany({ where, orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }], take: userId ? 3 : 20, select: { id: true } });
  for (const delivery of deliveries) await processCaktoDelivery(delivery.id);
  return deliveries.length;
}
