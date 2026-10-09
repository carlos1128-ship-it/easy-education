/**
 * Repetição espaçada das questões de revisão (variação simples do SM-2).
 * Notas: again (errei de novo), hard (difícil), good (bom), easy (fácil).
 */
export type ReviewGrade = "again" | "hard" | "good" | "easy";
export const REVIEW_GRADES: readonly ReviewGrade[] = ["again", "hard", "good", "easy"];

export type ReviewState = { easeFactor: number; intervalDays: number; repetitions: number };

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function nextSchedule(state: ReviewState, grade: ReviewGrade, now: Date = new Date()): ReviewState & { nextReview: Date } {
  let { easeFactor, intervalDays, repetitions } = state;

  if (grade === "again") {
    // Errou de novo: volta a ser visto amanhã e a sequência recomeça.
    easeFactor = Math.max(MIN_EASE, easeFactor - 0.2);
    intervalDays = 1;
    repetitions = 0;
  } else {
    if (grade === "hard") easeFactor = Math.max(MIN_EASE, easeFactor - 0.15);
    if (grade === "easy") easeFactor += 0.15;
    // Os primeiros acertos têm degraus fixos (1 dia, 3 dias); depois o intervalo cresce pela facilidade.
    const base = repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(intervalDays * easeFactor);
    const factor = grade === "hard" ? 0.8 : grade === "easy" ? 1.4 : 1;
    intervalDays = Math.max(1, Math.round(base * factor));
    repetitions += 1;
  }

  return { easeFactor: Math.round(easeFactor * 100) / 100, intervalDays, repetitions, nextReview: new Date(now.getTime() + intervalDays * DAY_MS) };
}

/** Texto para os botões ("volta em 3 dias"). */
export function intervalLabel(days: number) {
  if (days <= 1) return "amanhã";
  if (days < 30) return `em ${days} dias`;
  const months = Math.round(days / 30);
  return months <= 1 ? "em 1 mês" : `em ${months} meses`;
}
