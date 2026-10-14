import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  getUsageSnapshot: vi.fn(),
  withFeature: vi.fn(),
  explainOfficialQuestions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ bankQuestion: { findMany: mocks.findMany, updateMany: mocks.updateMany } }),
}));
vi.mock("@/lib/usage", () => ({
  getUsageSnapshot: mocks.getUsageSnapshot,
  withFeature: mocks.withFeature,
  PlanLimitError: class PlanLimitError extends Error {},
}));
vi.mock("@/lib/bank/ai", () => ({ explainOfficialQuestions: mocks.explainOfficialQuestions }));

import { ensureOfficialQuestionExplanations } from "@/lib/bank/explanations";

const rows = ["q1", "q2", "q3"].map((id) => ({
  id,
  supportText: "Contexto da questão.",
  statement: "Qual alternativa apresenta a conclusão correta?",
  options: ["A) Primeiro", "B) Segundo", "C) Terceiro", "D) Quarto"],
  correctLabel: "B",
  explanation: null,
}));

describe("ensureOfficialQuestionExplanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue(rows);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.withFeature.mockImplementation(async (_user, _feature, run) => run());
    mocks.explainOfficialQuestions.mockResolvedValue([
      "A alternativa B é a correta porque os dados do enunciado confirmam essa relação. As demais opções contradizem a evidência apresentada.",
    ]);
  });

  it("não chama a IA quando a cota diária do recurso acabou", async () => {
    mocks.getUsageSnapshot.mockResolvedValue({ tier: "basic", features: { ai_quiz: { remaining: 0 } } });

    const generated = await ensureOfficialQuestionExplanations({ questionIds: ["q1"], user: { id: "user-1" }, feature: "ai_quiz" });

    expect(generated.size).toBe(0);
    expect(mocks.withFeature).not.toHaveBeenCalled();
    expect(mocks.explainOfficialQuestions).not.toHaveBeenCalled();
  });

  it("limita a geração ao saldo e reserva os usos antes de chamar a IA", async () => {
    mocks.getUsageSnapshot.mockResolvedValue({ tier: "basic", features: { ai_quiz: { remaining: 1 } } });

    const generated = await ensureOfficialQuestionExplanations({ questionIds: ["q1", "q2", "q3"], user: { id: "user-1" }, feature: "ai_quiz" });

    expect(generated.size).toBe(1);
    expect(mocks.withFeature).toHaveBeenCalledTimes(1);
    expect(mocks.withFeature.mock.calls[0][3]).toEqual({ tier: "basic", amount: 1 });
    expect(mocks.explainOfficialQuestions).toHaveBeenCalledTimes(1);
    expect(mocks.explainOfficialQuestions.mock.calls[0][0]).toHaveLength(1);
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
  });
});
