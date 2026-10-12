import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/prisma";
import { getCaktoSubscription } from "@/lib/cakto";
import { processCaktoWebhookEvent } from "@/lib/cakto-events";

vi.mock("@/lib/prisma", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/cakto", () => ({ getCaktoSubscription: vi.fn() }));
vi.mock("@/lib/billing", () => ({ subscriptionGivesAccess: (status: string) => ["active", "trialing", "past_due"].includes(status) }));

const upsert = vi.fn();
const createEvent = vi.fn();
const findSubscription = vi.fn();
const findEvent = vi.fn();
const findAttempt = vi.fn();
const tx = { subscription: { upsert }, caktoEvent: { create: createEvent }, caktoCheckoutAttempt: { update: vi.fn() } };
const order = { id: "order-1", callback: "callback-1", offer: { id: "offer-1" }, status: "paid", amount: 19.9, paidAt: "2026-10-12T12:00:00Z", subscription: { id: "sub-1", status: "active" } };

beforeEach(() => {
  vi.clearAllMocks();
  createEvent.mockResolvedValue({});
  findSubscription.mockResolvedValue(null);
  findEvent.mockResolvedValue(null);
  findAttempt.mockResolvedValue({ id: "callback-1", userId: "user-1", plan: "basic", offerId: "offer-1", orderId: null, completedAt: null });
  vi.mocked(getCaktoSubscription).mockResolvedValue({ id: "sub-1", status: "active", next_payment_date: "2026-11-11T12:00:00Z" });
  vi.mocked(getPrisma).mockReturnValue({ subscription: { findUnique: findSubscription }, caktoCheckoutAttempt: { findUnique: findAttempt }, caktoEvent: { findUnique: findEvent }, $transaction: (run: (client: typeof tx) => Promise<unknown>) => run(tx) } as unknown as ReturnType<typeof getPrisma>);
});

describe("concessao de acesso Cakto", () => {
  it("nao reativa uma compra estornada ao receber aprovacao atrasada", async () => {
    findSubscription.mockResolvedValue({ userId: "user-1", caktoSubscriptionId: "sub-1", refundedAt: new Date(), status: "canceled" });
    await processCaktoWebhookEvent("purchase_approved", order);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("aguarda consistencia da API antes de concluir um pagamento aprovado", async () => {
    vi.mocked(getCaktoSubscription).mockResolvedValue({ id: "sub-1", status: "inactive", next_payment_date: null });
    await expect(processCaktoWebhookEvent("purchase_approved", order)).rejects.toThrow("ativacao");
    expect(upsert).not.toHaveBeenCalled();
  });
  it("mantem eventos sem conta vinculada pendentes em vez de descarta-los", async () => {
    findAttempt.mockResolvedValue(null);
    await expect(processCaktoWebhookEvent("purchase_approved", order)).rejects.toThrow("vinculo");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("renovacao sem callback encontra o assinante e atualiza o vencimento", async () => {
    findAttempt.mockResolvedValue(null);
    findSubscription.mockResolvedValue({ userId: "user-1", provider: "cakto", caktoSubscriptionId: "sub-1", status: "active", plan: "basic", firstPaidAt: new Date(order.paidAt) });
    await processCaktoWebhookEvent("subscription_renewed", { ...order, id: "renewal-2", callback: null });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" }, update: expect.objectContaining({ status: "active", currentPeriodEnd: new Date("2026-11-11T12:00:00Z"), firstPaidAt: new Date(order.paidAt) }) }));
  });

  it("recusa de renovacao registra a pendencia sem inventar um pagamento", async () => {
    vi.mocked(getCaktoSubscription).mockResolvedValue({ id: "sub-1", status: "late", next_payment_date: "2026-10-12T12:00:00Z" });
    await processCaktoWebhookEvent("subscription_renewal_refused", { ...order, status: "refused", paidAt: null });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "past_due", firstPaidAt: null }) }));
  });

  it("estorno e chargeback revogam acesso mesmo que a assinatura ainda apareca ativa", async () => {
    for (const event of ["refund", "chargeback"]) {
      await processCaktoWebhookEvent(event, order);
      expect(upsert).toHaveBeenLastCalledWith(expect.objectContaining({ update: expect.objectContaining({ status: "canceled" }) }));
    }
  });
  it("grava o plano, o primeiro pagamento e a proxima cobranca confirmada pela API", async () => {
    expect(await processCaktoWebhookEvent("purchase_approved", order)).toEqual({ processed: 1 });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ provider: "cakto", plan: "basic", status: "active", firstPaidAt: new Date(order.paidAt), currentPeriodEnd: new Date("2026-11-11T12:00:00Z") }) }));
  });

  it("nao concede acesso a uma assinatura criada aguardando pagamento", async () => {
    await processCaktoWebhookEvent("subscription_created", { ...order, status: "waiting_payment" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("libera um trial autorizado sem marcar uma cobranca como paga", async () => {
    vi.mocked(getCaktoSubscription).mockResolvedValue({ id: "sub-1", status: "trial", next_payment_date: "2026-10-19T12:00:00Z" });
    await processCaktoWebhookEvent("subscription_created", { ...order, status: "waiting_payment", paidAt: null, amount: 0, subscription: { id: "sub-1", status: "trial" } });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "trialing", firstPaidAt: null }) }));
  });

  it("rejeita callbacks usados em outra oferta", async () => {
    await processCaktoWebhookEvent("purchase_approved", { ...order, offer: { id: "another-offer" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("nao substitui uma assinatura Stripe ativa", async () => {
    findSubscription.mockImplementation(({ where }) => Promise.resolve(where.userId ? { provider: "stripe", status: "active" } : null));
    await processCaktoWebhookEvent("purchase_approved", order);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("consulta o estado atual para nao reativar uma assinatura cancelada por evento atrasado", async () => {
    vi.mocked(getCaktoSubscription).mockResolvedValue({ id: "sub-1", status: "canceled", next_payment_date: null });
    await processCaktoWebhookEvent("purchase_approved", order);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ status: "canceled" }) }));
  });

  it("distingue um evento duplicado de outro conflito de unicidade", async () => {
    createEvent.mockRejectedValue({ code: "P2002" });
    findEvent.mockResolvedValue({ id: "purchase_approved:order-1" });
    expect(await processCaktoWebhookEvent("purchase_approved", order)).toEqual({ processed: 0 });
    findEvent.mockResolvedValue(null);
    await expect(processCaktoWebhookEvent("purchase_approved", order)).rejects.toEqual({ code: "P2002" });
  });
});
