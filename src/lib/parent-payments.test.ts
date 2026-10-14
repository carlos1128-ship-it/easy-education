import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
const mocks = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), checkoutCreate: vi.fn(), checkoutRetrieve: vi.fn(), subscriptionRetrieve: vi.fn(), sync: vi.fn(), access: vi.fn(), markPaid: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ parentPaymentRequest: { findUnique: mocks.find, create: mocks.create, update: mocks.update, updateMany: mocks.updateMany } }) }));
vi.mock("@/lib/profile", () => ({ ensureProfileForUser: vi.fn() }));
vi.mock("@/lib/billing", () => ({ BillingError: class extends Error { constructor(message: string, public status: number) { super(message); } }, getAccessState: mocks.access, syncSubscription: mocks.sync, markFirstPayment: mocks.markPaid, subscriptionGivesAccess: (status: string) => status === "active" }));
vi.mock("@/lib/stripe", () => ({ checkoutBranding: () => ({ display_name: "Easy Education" }), isStripeTestMode: () => true, getStripe: () => ({ checkout: { sessions: { create: mocks.checkoutCreate, retrieve: mocks.checkoutRetrieve } }, subscriptions: { retrieve: mocks.subscriptionRetrieve } }), getPriceForPlan: async () => ({ id: "price_test", unit_amount: 3490, currency: "brl", recurring: { interval: "month" } }), PLANS: { full: { priceCents: 3490 } } }));
import { completeParentPayment, createParentCheckout, getParentPaymentRequest } from "./parent-payments";
const token = "a".repeat(43);
const request = { id: "request-1", userId: "student-1", plan: "full", tokenHash: "hash", expiresAt: new Date(Date.now() + 86_400_000), completedAt: null, stripeSessionId: null, profile: { name: "Aluno" } };
const session = () => ({ id: "cs_test_payment", client_reference_id: "student-1", metadata: { parentRequestId: "request-1", userId: "student-1", plan: "full" }, status: "complete", payment_status: "paid", livemode: false, subscription: "sub_test", customer: "cus_parent", created: 1_791_900_000 }) as unknown as Stripe.Checkout.Session;
beforeEach(() => {
  vi.clearAllMocks(); mocks.find.mockResolvedValue(request); mocks.access.mockResolvedValue({ isPaid: false });
  mocks.checkoutCreate.mockResolvedValue({ id: "cs_test_payment", url: "https://checkout.stripe.com/test-session" });
  mocks.subscriptionRetrieve.mockResolvedValue({ id: "sub_test", metadata: { userId: "student-1", parentRequestId: "request-1", plan: "full" } });
  mocks.sync.mockResolvedValue({ userId: "student-1", provider: "stripe", status: "active" });
});
describe("pagamento dos pais vinculado ao estudante", () => {
  it("recusa código inválido sem consultar dados", async () => { expect(await getParentPaymentRequest("student-1")).toBeNull(); expect(mocks.find).not.toHaveBeenCalled(); });
  it("recusa link expirado", async () => { mocks.find.mockResolvedValue({ ...request, expiresAt: new Date(0) }); expect(await getParentPaymentRequest(token)).toBeNull(); });
  it("cria checkout para o beneficiário salvo, sem exigir conta do pagador", async () => {
    await createParentCheckout(token, "https://example.org");
    expect(mocks.checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({ client_reference_id: "student-1", metadata: { userId: "student-1", plan: "full", parentRequestId: "request-1" }, subscription_data: { metadata: { userId: "student-1", plan: "full", parentRequestId: "request-1" } } }), expect.objectContaining({ idempotencyKey: "parent-request-1-first" }));
  });
  it("não concede acesso antes da confirmação do pagamento", async () => {
    mocks.find.mockResolvedValue({ ...request, stripeSessionId: "cs_test_payment" });
    expect(await completeParentPayment({ ...session(), payment_status: "unpaid" })).toBe(false);
    expect(mocks.sync).not.toHaveBeenCalled(); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("não reabre cobrança pendente quando o estudante já pagou por outro fluxo", async () => {
    mocks.find.mockResolvedValue({ ...request, stripeSessionId: "cs_test_payment" });
    mocks.checkoutRetrieve.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/test-session" });
    mocks.access.mockResolvedValue({ isPaid: true });
    await expect(createParentCheckout(token, "https://example.org")).rejects.toMatchObject({ status: 409 });
    expect(mocks.checkoutCreate).not.toHaveBeenCalled();
  });
  it("recusa trocar a conta beneficiada pelo conteúdo da sessão", async () => {
    mocks.find.mockResolvedValue({ ...request, stripeSessionId: "cs_test_payment" });
    await expect(completeParentPayment({ ...session(), client_reference_id: "other-student" })).rejects.toMatchObject({ status: 403 });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("recusa pagamento real no ambiente de teste", async () => {
    mocks.find.mockResolvedValue({ ...request, stripeSessionId: "cs_test_payment" });
    await expect(completeParentPayment({ ...session(), livemode: true })).rejects.toMatchObject({ status: 400 });
  });
  it("confirma a assinatura do estudante e marca o pedido como pago", async () => {
    mocks.find.mockResolvedValue({ ...request, stripeSessionId: "cs_test_payment" });
    expect(await completeParentPayment(session())).toBe(true);
    expect(mocks.markPaid).toHaveBeenCalledWith("cus_parent", expect.any(Date));
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "request-1", completedAt: null }, data: { completedAt: expect.any(Date) } });
  });
});
