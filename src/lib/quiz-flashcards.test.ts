import { describe, expect, it } from "vitest";
import { orderSourceQuestions, plannedCardCount } from "@/lib/quiz-flashcards";

describe("flashcards a partir do quiz", () => {
  it("erradas primeiro, na ordem do quiz; sem resposta fica de fora", () => {
    const questions = [
      { id: "a", order: 0, isCorrect: true },
      { id: "b", order: 1, isCorrect: false },
      { id: "c", order: 2, isCorrect: null },
      { id: "d", order: 3, isCorrect: false },
    ];
    expect(orderSourceQuestions(questions).map((question) => question.id)).toEqual(["b", "d", "a"]);
  });

  it("um cartão por erro (até 10) mais 3 de conceito, no mínimo 4", () => {
    expect(plannedCardCount(0)).toBe(4);
    expect(plannedCardCount(2)).toBe(5);
    expect(plannedCardCount(30)).toBe(13);
  });
});
