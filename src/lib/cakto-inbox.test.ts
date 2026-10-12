import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@/lib/prisma";
import { processCaktoWebhookEvent } from "@/lib/cakto-events";
import { enqueueCaktoWebhook, processCaktoDelivery } from "@/lib/cakto-inbox";

vi.mock("@/lib/prisma", () => ({ getPrisma: vi.fn() }));
vi.mock("@/lib/cakto-events", () => ({ processCaktoWebhookEvent: vi.fn() }));
const upsert = vi.fn();
const findUnique = vi.fn();
const updateMany = vi.fn();
const update = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({ caktoWebhookDelivery: { upsert, findUnique, updateMany, update } } as unknown as ReturnType<typeof getPrisma>);
  findUnique.mockResolvedValue({ id: "delivery", event: "purchase_approved", data: { id: "order" }, attempts: 0, processedAt: null });
  updateMany.mockResolvedValue({ count: 1 });
  vi.mocked(processCaktoWebhookEvent).mockResolvedValue({ processed: 1 });
});

describe("inbox Cakto", () => {
  it("persiste e deduplica antes de processar", async () => {
    const payload = { id: "order", callback: "callback" };
    const first = await enqueueCaktoWebhook("purchase_approved", payload);
    expect(await enqueueCaktoWebhook("purchase_approved", [payload])).toEqual(first);
    expect(processCaktoWebhookEvent).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ callback: "callback", data: payload }), update: {} }));
  });
  it("so marca concluido depois da liberacao e limpa os dados pessoais", async () => {
    await processCaktoDelivery("delivery");
    expect(processCaktoWebhookEvent).toHaveBeenCalledWith("purchase_approved", { id: "order" }, "delivery");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ processedAt: expect.any(Date) }) }));
  });
  it("mantem o evento para nova tentativa quando a API falha", async () => {
    vi.mocked(processCaktoWebhookEvent).mockRejectedValueOnce(new Error("API offline"));
    await processCaktoDelivery("delivery");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { nextAttemptAt: expect.any(Date) } }));
  });
  it("nao processa uma entrega ja concluida ou reclamada por outra execucao", async () => {
    findUnique.mockResolvedValueOnce({ processedAt: new Date() });
    await processCaktoDelivery("delivery");
    updateMany.mockResolvedValueOnce({ count: 0 });
    await processCaktoDelivery("delivery");
    expect(processCaktoWebhookEvent).not.toHaveBeenCalled();
  });
});
