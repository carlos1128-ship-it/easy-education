import { describe, expect, it } from "vitest";
import { currentAiCallContext, runWithAiCallContext, setAiCallContext } from "@/lib/ai-cost";

/**
 * Contexto das chamadas de IA. Até 10/10/2026 ele era definido só dentro de consumeFeature e, no servidor do Next,
 * não chegava às chamadas da IA (579 de 581 sem aluno; tetos de custo por aluno nunca disparavam). Medido no
 * servidor: definido no chamador, depois do await (withFeature e bindAiCallContext), as chamadas saem com aluno.
 */
describe("contexto das chamadas de IA (aluno, plano, recurso)", () => {
  it("definido no próprio chamador depois do await, vale para as chamadas seguintes (a correção)", async () => {
    await runWithAiCallContext({}, async () => {
      const consume = async () => ({ tier: "basic" as const });
      const ticket = await consume();
      setAiCallContext({ userId: "aluno", plan: ticket.tier, feature: "ai_quiz" });
      const generate = async () => currentAiCallContext();
      expect(await generate()).toEqual({ userId: "aluno", plan: "basic", feature: "ai_quiz" });
    });
  });
});
