import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), updateMany: vi.fn(), requireTier: vi.fn(), assertWithinSafetyCaps: vi.fn(), explainOfficialQuestions: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ bankQuestion: { findMany: mocks.findMany, updateMany: mocks.updateMany } }) }));
vi.mock("@/lib/usage", () => ({ requireTier: mocks.requireTier, assertWithinSafetyCaps: mocks.assertWithinSafetyCaps }));
vi.mock("@/lib/bank/ai", () => ({ explainOfficialQuestions: mocks.explainOfficialQuestions }));
vi.mock("@/lib/ai-cost", () => ({ runWithAiCallContext: (_context: unknown, run: () => Promise<unknown>) => run() }));
import { ensureOfficialQuestionExplanations } from "@/lib/bank/explanations";
const explanation = "O resultado decorre da relação entre os dados apresentados no enunciado. As demais alternativas contradizem essa relação.";
const rows = ["q1", "q2", "q3"].map((id) => ({ id, supportText: "Contexto.", statement: "Qual conclusão?", options: [{ label: "A", text: "Primeiro" }, { label: "B", text: "Segundo" }], correctLabel: "B", explanation: null }));
describe("explicações obrigatórias de questões oficiais", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.findMany.mockResolvedValue(rows); mocks.requireTier.mockResolvedValue("basic"); mocks.assertWithinSafetyCaps.mockResolvedValue(undefined); mocks.updateMany.mockResolvedValue({ count: 1 }); mocks.explainOfficialQuestions.mockResolvedValue(rows.map(() => explanation)); });
  it("prepara a devolutiva de todas as questões sem gastar a cota de criação", async () => {
    const generated = await ensureOfficialQuestionExplanations({ questionIds: rows.map((r) => r.id), user: { id: "student" }, feature: "ai_quiz" });
    expect(generated.size).toBe(3);
    expect(mocks.assertWithinSafetyCaps).toHaveBeenCalledWith({ id: "student" }, { tier: "basic" });
    expect(mocks.updateMany).toHaveBeenCalledTimes(3);
    expect(mocks.explainOfficialQuestions.mock.calls[0][0][0].options).toEqual(["A) Primeiro", "B) Segundo"]);
  });
  it("não grava substitutos quando a geração falha", async () => {
    mocks.explainOfficialQuestions.mockRejectedValue(new Error("temporariamente indisponível"));
    const generated = await ensureOfficialQuestionExplanations({ questionIds: ["q1"], user: { id: "student" }, feature: "ai_quiz" });
    expect(generated.size).toBe(0); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("reutiliza explicações existentes sem nova chamada", async () => {
    mocks.findMany.mockResolvedValue(rows.map((r) => ({ ...r, explanation })));
    await ensureOfficialQuestionExplanations({ questionIds: ["q1"], user: { id: "student" }, feature: "ai_quiz" });
    expect(mocks.explainOfficialQuestions).not.toHaveBeenCalled();
  });
});
