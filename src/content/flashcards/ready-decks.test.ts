import { describe, expect, it } from "vitest";
import { SEED_SUBJECTS } from "@/lib/bank/constants";
import { READY_DECKS } from "@/content/flashcards";

describe("baralhos prontos", () => {
  it("têm identificador único, matéria do banco e cartões completos", () => {
    expect(new Set(READY_DECKS.map((deck) => deck.slug)).size).toBe(READY_DECKS.length);
    for (const deck of READY_DECKS) {
      expect(SEED_SUBJECTS.some((subject) => subject.slug === deck.subjectSlug && subject.name === deck.subject)).toBe(true);
      expect(deck.cards.length).toBeGreaterThanOrEqual(10);
      for (const card of deck.cards) {
        expect(card.front.trim().length).toBeGreaterThanOrEqual(3);
        expect(card.back.trim().length).toBeGreaterThan(1);
      }
      expect(new Set(deck.cards.map((card) => card.front)).size).toBe(deck.cards.length);
    }
  });
});
