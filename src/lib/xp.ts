/**
 * Pontos de experiência (XP) e níveis. Regras puras: o servidor conta as atividades (gamification.ts) e
 * a interface mostra nível, barra para o próximo e o XP da semana. Nada aqui é guardado: o XP sai do histórico,
 * então nunca fica diferente do que o aluno fez.
 */

export const XP_RULES = {
  /** Questão certa (quiz, simulado ou prova anterior). */
  correct: 10,
  /** Questão errada: tentar também conta, um pouco. */
  wrong: 2,
  /** Cartão de flashcard revisado. */
  card: 3,
  /** Bloco do plano concluído. */
  block: 50,
  /** Dia fechado com resumo corrigido. */
  daySummary: 30,
  /** Redação corrigida. */
  essay: 40,
  /** Minuto de estudo registrado no cronômetro (até 120 por dia). */
  minute: 1,
} as const;

export const MAX_MINUTES_XP_PER_DAY = 120;

export type XpActivity = {
  correct: number;
  wrong: number;
  cards: number;
  blocks: number;
  daySummaries: number;
  essays: number;
  minutes: number;
};

export function xpFor(activity: Partial<XpActivity>) {
  return (
    (activity.correct ?? 0) * XP_RULES.correct +
    (activity.wrong ?? 0) * XP_RULES.wrong +
    (activity.cards ?? 0) * XP_RULES.card +
    (activity.blocks ?? 0) * XP_RULES.block +
    (activity.daySummaries ?? 0) * XP_RULES.daySummary +
    (activity.essays ?? 0) * XP_RULES.essay +
    (activity.minutes ?? 0) * XP_RULES.minute
  );
}

/** XP total para chegar ao nível `level` (nível 1 = 0). Cada nível pede 100 XP a mais que o anterior. */
export function xpForLevel(level: number) {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 50 * n * (n + 1);
}

export type LevelInfo = { level: number; xp: number; levelStart: number; nextLevel: number; progress: number; toNext: number };

/** Nível atual, onde ele começa, quanto falta e o progresso (0 a 1) até o próximo. */
export function levelFor(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  const levelStart = xpForLevel(level);
  const nextLevel = xpForLevel(level + 1);
  return { level, xp: total, levelStart, nextLevel, progress: (total - levelStart) / (nextLevel - levelStart), toNext: nextLevel - total };
}

/** Títulos por faixa de nível, para dar nome ao progresso. */
const TITLES: Array<[number, string]> = [
  [1, "Calouro"],
  [3, "Estudante"],
  [6, "Dedicado"],
  [10, "Focado"],
  [15, "Expert"],
  [21, "Mestre"],
  [30, "Lenda"],
];

export function levelTitle(level: number) {
  return [...TITLES].reverse().find(([min]) => level >= min)?.[1] ?? "Calouro";
}
