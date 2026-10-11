import { READY_DECKS, readyDeckBySlug, type ReadyDeck } from "@/content/flashcards";
import { bankSubjectsFor } from "@/lib/bank/quiz-fallback";
import { getPrisma } from "@/lib/prisma";

/**
 * Baralhos prontos (src/content/flashcards): o aluno adiciona e revisa sem IA. Também são a reserva quando o
 * limite de flashcards por IA acaba ou a IA falha. O baralho copiado é um deck comum do aluno (com a
 * repetição espaçada dele), com o título = tema do baralho pronto.
 */

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Baralhos prontos que o aluno já adicionou (pelo título e matéria). */
export async function addedReadyDeckIds(userId: string) {
  const decks = await getPrisma().flashcardDeck.findMany({
    where: { userId, title: { in: READY_DECKS.map((deck) => deck.topic) } },
    select: { id: true, title: true, subject: true },
  });
  const added = new Map<string, string>();
  for (const ready of READY_DECKS) {
    const match = decks.find((deck) => deck.title === ready.topic && deck.subject === ready.subject);
    if (match) added.set(ready.slug, match.id);
  }
  return added;
}

/** Copia o baralho pronto para o aluno (ou devolve o que ele já tem). */
export async function addReadyDeck(userId: string, deck: ReadyDeck) {
  const prisma = getPrisma();
  const existing = await prisma.flashcardDeck.findFirst({ where: { userId, title: deck.topic, subject: deck.subject }, select: { id: true } });
  if (existing) return existing;
  return prisma.flashcardDeck.create({
    data: {
      userId,
      title: deck.topic,
      subject: deck.subject,
      flashcards: { create: deck.cards.map((card) => ({ front: card.front, back: card.back, sourceKind: "conceito" })) },
    },
    select: { id: true },
  });
}

export async function addReadyDeckBySlug(userId: string, slug: string) {
  const deck = readyDeckBySlug(slug);
  return deck ? addReadyDeck(userId, deck) : null;
}

/**
 * Melhor baralho pronto para o pedido (matéria + tema): o que mais combina com as palavras do tema,
 * de preferência um que o aluno ainda não tem. null se a matéria não tem baralho pronto.
 */
export async function pickReadyDeckFor(userId: string, subject: string, topic?: string | null) {
  const slugs = bankSubjectsFor(subject, topic);
  const candidates = READY_DECKS.filter((deck) => slugs.includes(deck.subjectSlug));
  if (!candidates.length) return null;
  const text = normalize(`${topic ?? ""} ${subject}`);
  const added = await addedReadyDeckIds(userId);
  const scored = candidates
    .map((deck) => ({
      deck,
      score: deck.keywords.filter((keyword) => text.includes(normalize(keyword))).length * 2 + (normalize(deck.topic).split(/\W+/).some((word) => word.length > 4 && text.includes(word)) ? 1 : 0),
    }))
    .sort((a, b) => Number(added.has(a.deck.slug)) - Number(added.has(b.deck.slug)) || b.score - a.score);
  return scored[0].deck;
}
