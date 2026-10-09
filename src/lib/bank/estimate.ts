/**
 * Estimativa de nota de um simulado do banco.
 *
 * ATENÇÃO: não é a nota TRI do INEP. A TRI pondera cada questão pelos parâmetros dela, que o INEP só
 * divulga para algumas edições. Aqui o percentual de acerto vira uma faixa numa escala de 300 a 900 por
 * área, de forma linear, só para dar uma ideia de ordem de grandeza. Por isso a interface sempre diz
 * "estimativa baseada no seu desempenho" e nunca "nota TRI".
 */
export const ESTIMATE_DISCLAIMER =
  "Estimativa baseada no seu desempenho: converte o seu percentual de acerto numa escala de 300 a 900 por área, sem usar a TRI do INEP. A nota real do ENEM pode ser bem diferente.";

const MIN = 300;
const MAX = 900;
/** Margem para cada lado, para deixar claro que é uma faixa e não um número exato. */
const MARGIN = 50;

export type ScoreEstimate = { low: number; high: number; mid: number };

export function estimateAreaScore(correct: number, total: number): ScoreEstimate | null {
  if (total <= 0) return null;
  const accuracy = Math.min(1, Math.max(0, correct / total));
  const mid = MIN + accuracy * (MAX - MIN);
  return { mid: Math.round(mid), low: Math.max(MIN, Math.round(mid - MARGIN)), high: Math.min(MAX, Math.round(mid + MARGIN)) };
}

/** Média das áreas que tiveram questões (cada área pesa igual, como no ENEM). */
export function estimateOverallScore(areas: Array<{ correct: number; total: number }>): ScoreEstimate | null {
  const estimates = areas.map((area) => estimateAreaScore(area.correct, area.total)).filter((item): item is ScoreEstimate => item !== null);
  if (!estimates.length) return null;
  const avg = (key: keyof ScoreEstimate) => Math.round(estimates.reduce((sum, item) => sum + item[key], 0) / estimates.length);
  return { low: avg("low"), high: avg("high"), mid: avg("mid") };
}

export function percent(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}
