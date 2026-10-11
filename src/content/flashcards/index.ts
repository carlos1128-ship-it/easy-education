import { biologiaDecks } from "./biologia";
import { exatasDecks } from "./exatas";
import { humanasDecks } from "./humanas";
import { linguagensDecks } from "./linguagens";
import type { ReadyDeck } from "./types";

export type { ReadyCard, ReadyDeck } from "./types";

/** Todos os baralhos prontos, na ordem das matérias. */
export const READY_DECKS: ReadyDeck[] = [...linguagensDecks, ...exatasDecks, ...biologiaDecks, ...humanasDecks];

export function readyDeckBySlug(slug: string) {
  return READY_DECKS.find((deck) => deck.slug === slug) ?? null;
}
