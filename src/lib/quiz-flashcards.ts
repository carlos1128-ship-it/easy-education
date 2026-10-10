import { Type, type Schema } from "@google/genai";
import { generateJSON } from "@/lib/gemini";
import { getLearnerPromptProfile, learnerPromptBlock } from "@/lib/exam-style";
import { getPrisma } from "@/lib/prisma";
import { verifyFlashcards } from "@/lib/question-quality";

/**
 * Flashcards a partir de um quiz ou simulado terminado (item 1.5). É uma opção que o aluno pede no resultado,
 * não algo automático. Os cartões priorizam as questões que o aluno errou e depois os conceitos do assunto,
 * e cada cartão guarda a questão de onde veio (Flashcard.sourceQuizQuestionId).
 */

/** Deck do mesmo assunto criado há menos que isto é oferecido para receber os cartões novos. */
export const RECENT_DECK_DAYS = 7;
/** Questões erradas enviadas à IA (as mais antigas na ordem do quiz). */
const MAX_WRONG = 10;

export type SourceQuestion = { id: string; question: string; correctAnswer: string; options: unknown; explanation: string; isCorrect: boolean | null; order: number };

/** Erradas primeiro (na ordem do quiz), depois as certas. Sem resposta não entra. */
export function orderSourceQuestions<T extends Pick<SourceQuestion, "isCorrect" | "order">>(questions: T[]) {
  const answered = questions.filter((question) => question.isCorrect !== null).sort((a, b) => a.order - b.order);
  return [...answered.filter((question) => question.isCorrect === false), ...answered.filter((question) => question.isCorrect === true)];
}

/** Quantos cartões: um por erro (até 10) e mais 3 de conceitos do assunto, entre 4 e 13. */
export function plannedCardCount(wrong: number) {
  return Math.max(4, Math.min(MAX_WRONG, wrong) + 3);
}

const schema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: { type: Type.STRING },
      back: { type: Type.STRING },
      source: { type: Type.INTEGER, description: "Número da questão errada que originou o cartão; 0 para cartão de conceito do assunto." },
    },
    required: ["front", "back", "source"],
    propertyOrdering: ["front", "back", "source"],
  },
};

function optionText(options: unknown, letter: string) {
  const list = Array.isArray(options) ? options.map(String) : [];
  return list.find((option) => option.trim().toUpperCase().startsWith(`${letter})`))?.replace(/^[A-E]\)\s*/, "") ?? letter;
}

/** Deck do mesmo assunto criado nos últimos dias, para oferecer "adicionar a ele" em vez de criar outro. */
export async function findRecentDeck(userId: string, subject: string) {
  return getPrisma().flashcardDeck.findFirst({
    where: { userId, subject, createdAt: { gte: new Date(Date.now() - RECENT_DECK_DAYS * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, _count: { select: { flashcards: true } } },
  });
}

/** Gera os cartões do quiz e grava num deck novo ou num deck existente do aluno. Devolve o deck e quantos entraram. */
export async function createFlashcardsFromQuiz(input: { userId: string; quizId: string; deckId?: string | null }) {
  const prisma = getPrisma();
  const quiz = await prisma.quiz.findFirst({
    where: { id: input.quizId, userId: input.userId },
    include: { questions: { select: { id: true, question: true, correctAnswer: true, options: true, explanation: true, isCorrect: true, order: true } } },
  });
  if (!quiz) throw new FlashcardsFromQuizError("Quiz não encontrado.", 404);
  if (!quiz.completedAt) throw new FlashcardsFromQuizError("Termine o quiz antes de criar os flashcards.", 409);
  const targetDeck = input.deckId ? await prisma.flashcardDeck.findFirst({ where: { id: input.deckId, userId: input.userId }, select: { id: true } }) : null;
  if (input.deckId && !targetDeck) throw new FlashcardsFromQuizError("Deck não encontrado.", 404);

  const ordered = orderSourceQuestions(quiz.questions);
  const wrong = ordered.filter((question) => question.isCorrect === false).slice(0, MAX_WRONG);
  const count = plannedCardCount(wrong.length);
  const learner = await getLearnerPromptProfile(input.userId, quiz.subject);
  const listing = wrong
    .map((question, index) => `${index + 1}) ${question.question.slice(0, 600)}\nResposta certa: ${optionText(question.options, question.correctAnswer)}\nExplicação: ${question.explanation.slice(0, 400)}`)
    .join("\n\n");

  const raw = await generateJSON<Array<{ front: string; back: string; source: number }>>(
    `Crie exatamente ${count} flashcards de revisão para um aluno que acabou de fazer um ${quiz.difficulty === "simulado" ? "simulado" : "quiz"} de ${quiz.subject}${quiz.title ? ` ("${quiz.title}")` : ""}.
${wrong.length ? `Primeiro, um cartão para cada questão que ele ERROU (source = número da questão), cobrando o conceito que a questão exigia, não a questão inteira:\n\n${listing}\n\nDepois, ${count - wrong.length} cartões com os conceitos centrais do assunto (source = 0).` : `Ele não errou nenhuma questão: crie ${count} cartões com os conceitos centrais do assunto (source = 0).`}
Regras:
- Frente: pergunta objetiva que dá para responder sem ver o verso. Verso: resposta direta e curta, com o porquê.
- Não copie o enunciado das questões; cobre o conceito.
- Nível e linguagem adequados a ${learner.style}.${learnerPromptBlock(learner)}
Responda um array JSON com front, back e source.`,
    { schema, temperature: 0.3 },
  );

  const seen = new Set<string>();
  const cards = (Array.isArray(raw) ? raw : [])
    .map((card) => ({ front: String(card.front ?? "").trim(), back: String(card.back ?? "").trim(), source: Number(card.source) || 0 }))
    .filter((card) => card.front && card.back && !seen.has(card.front.toLowerCase()) && seen.add(card.front.toLowerCase()))
    .slice(0, count);
  const checked = (await verifyFlashcards(cards)).items as typeof cards;
  if (!checked.length) throw new FlashcardsFromQuizError("A IA não conseguiu criar cartões bons agora. Tente de novo.", 502);

  const data = checked.map((card) => {
    const source = card.source > 0 ? wrong[card.source - 1] : undefined;
    return { front: card.front, back: card.back, sourceQuizQuestionId: source?.id ?? null, sourceKind: source ? "erro" : "conceito" };
  });

  if (targetDeck) {
    await prisma.flashcard.createMany({ data: data.map((card) => ({ ...card, deckId: targetDeck.id })) });
    return { deckId: targetDeck.id, added: data.length, appended: true };
  }
  const deck = await prisma.flashcardDeck.create({
    data: {
      userId: input.userId,
      title: `Revisão: ${quiz.title}`.slice(0, 120),
      subject: quiz.subject,
      flashcards: { create: data },
    },
  });
  return { deckId: deck.id, added: data.length, appended: false };
}

export class FlashcardsFromQuizError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}
