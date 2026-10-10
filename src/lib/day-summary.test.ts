import { describe, expect, it } from "vitest";
import { SUMMARY_MAX_CHARS, SUMMARY_MIN_CHARS, daySummarySchema, describeStudied, hasStudied, normalizeFeedback, type StudiedToday } from "@/lib/day-summary-rules";

const empty: StudiedToday = { blocks: [], quizzes: [], mistakes: [], minutesBySubject: {}, flashcardsReviewed: 0 };

describe("fechar o dia", () => {
  it("valida 200 a 5.000 caracteres (sem contar espaços nas pontas)", () => {
    expect(daySummarySchema.safeParse({ content: "a".repeat(SUMMARY_MIN_CHARS - 1) }).success).toBe(false);
    expect(daySummarySchema.safeParse({ content: `  ${"a".repeat(SUMMARY_MIN_CHARS - 1)}  ` }).success).toBe(false);
    expect(daySummarySchema.safeParse({ content: "a".repeat(SUMMARY_MIN_CHARS) }).success).toBe(true);
    expect(daySummarySchema.safeParse({ content: "a".repeat(SUMMARY_MAX_CHARS + 1) }).success).toBe(false);
  });

  it("sem estudo registrado não há o que corrigir", () => {
    expect(hasStudied(empty)).toBe(false);
    expect(hasStudied({ ...empty, minutesBySubject: { Física: 20 } })).toBe(true);
  });

  it("o que foi estudado vira texto só com fatos do dia", () => {
    const text = describeStudied({
      ...empty,
      blocks: [{ subject: "Física", topic: "MRU", type: "estudo", done: true }],
      quizzes: [{ title: "MRU", subject: "Física", score: 70 }],
      mistakes: [{ subject: "Física", question: "Um carro a 72 km/h...", correct: "20 m/s" }],
    });
    expect(text).toContain("Bloco do plano: estudo de Física (MRU), concluído.");
    expect(text).toContain("acerto de 70%");
    expect(text).toContain("→ 20 m/s");
  });

  it("correção da IA vem sempre no formato da tela, mesmo incompleta", () => {
    const feedback = normalizeFeedback({ overview: "Bom resumo.", correct: ["ok", ""], wrong: [{ excerpt: "x", fix: "" }, { excerpt: "v = d/t²", fix: "v = d/t" }], cards: [{ front: "?", back: "" }] });
    expect(feedback.correct).toEqual(["ok"]);
    expect(feedback.wrong).toEqual([{ excerpt: "v = d/t²", fix: "v = d/t" }]);
    expect(feedback.cards).toEqual([]);
    expect(feedback.missing).toEqual([]);
    expect(normalizeFeedback(null).overview).toBe("");
  });
});
