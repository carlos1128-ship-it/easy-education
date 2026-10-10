import { z } from "zod";

/**
 * Regras puras do "Fechar o dia" (item 1.7), sem servidor: limites de tamanho, formato da correção e o texto do
 * que o aluno estudou. A tela (cliente) e a rota (servidor) usam as mesmas.
 */

export const SUMMARY_MIN_CHARS = 200;
export const SUMMARY_MAX_CHARS = 5000;

export const daySummarySchema = z.object({
  content: z
    .string()
    .trim()
    .min(SUMMARY_MIN_CHARS, `Escreva pelo menos ${SUMMARY_MIN_CHARS} caracteres.`)
    .max(SUMMARY_MAX_CHARS, `Use no máximo ${SUMMARY_MAX_CHARS} caracteres.`),
});

/** O que o aluno fez no dia, como é enviado à IA (e guardado junto com o resumo). */
export type StudiedToday = {
  blocks: Array<{ subject: string; topic: string; type: string; done: boolean }>;
  quizzes: Array<{ title: string; subject: string; score: number | null }>;
  mistakes: Array<{ subject: string; question: string; correct: string }>;
  minutesBySubject: Record<string, number>;
  flashcardsReviewed: number;
};

export type DaySummaryFeedback = {
  /** Uma frase de abertura, no tom da marca. */
  overview: string;
  correct: string[];
  wrong: Array<{ excerpt: string; fix: string }>;
  missing: string[];
  review: string[];
  /** Conceitos que o aluno escreveu errado, já como cartão (vira flashcard sem nova chamada à IA). */
  cards: Array<{ front: string; back: string }>;
};

export function hasStudied(studied: StudiedToday) {
  return studied.blocks.length > 0 || studied.quizzes.length > 0 || Object.keys(studied.minutesBySubject).length > 0 || studied.flashcardsReviewed > 0;
}

/** Texto do que foi estudado, para o prompt. Curto e só com fatos do banco. */
export function describeStudied(studied: StudiedToday) {
  const lines: string[] = [];
  for (const block of studied.blocks) lines.push(`- Bloco do plano: ${block.type} de ${block.subject}${block.topic ? ` (${block.topic})` : ""}${block.done ? ", concluído" : ", começado"}.`);
  for (const quiz of studied.quizzes) lines.push(`- Quiz/simulado: ${quiz.title} (${quiz.subject})${quiz.score === null ? "" : `, acerto de ${Math.round(quiz.score)}%`}.`);
  for (const [subject, minutes] of Object.entries(studied.minutesBySubject)) lines.push(`- Tempo de estudo: ${minutes} min de ${subject}.`);
  if (studied.flashcardsReviewed) lines.push(`- Flashcards revisados: ${studied.flashcardsReviewed}.`);
  if (studied.mistakes.length) {
    lines.push("- Questões que errou hoje (enunciado resumido → resposta certa):");
    for (const mistake of studied.mistakes) lines.push(`  • [${mistake.subject}] ${mistake.question} → ${mistake.correct}`);
  }
  return lines.join("\n");
}

/** Corta e normaliza a resposta da IA, para a tela nunca quebrar. */
export function normalizeFeedback(raw: unknown): DaySummaryFeedback {
  const value = (raw ?? {}) as Partial<Record<keyof DaySummaryFeedback, unknown>>;
  const strings = (list: unknown, max: number) => (Array.isArray(list) ? list.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, max) : []);
  return {
    overview: String(value.overview ?? "").trim().slice(0, 400),
    correct: strings(value.correct, 8),
    wrong: (Array.isArray(value.wrong) ? value.wrong : [])
      .map((item) => ({ excerpt: String((item as { excerpt?: unknown })?.excerpt ?? "").trim(), fix: String((item as { fix?: unknown })?.fix ?? "").trim() }))
      .filter((item) => item.fix)
      .slice(0, 8),
    missing: strings(value.missing, 8),
    review: strings(value.review, 6),
    cards: (Array.isArray(value.cards) ? value.cards : [])
      .map((item) => ({ front: String((item as { front?: unknown })?.front ?? "").trim(), back: String((item as { back?: unknown })?.back ?? "").trim() }))
      .filter((item) => item.front && item.back)
      .slice(0, 8),
  };
}

