/**
 * Confiabilidade das questões geradas por IA (item 1.2). Regras puras: intervalo de confiança e decisão do portão.
 * Os números saem de duas medições (scripts/eval/): o verificador contra o gabarito oficial e a revisão humana
 * de uma amostra de questões geradas. Ver docs/confiabilidade-ia.md.
 */

/** Piso: abaixo disto, o escopo (área ou matéria) usa o plano B até ser reavaliado. */
export const QUALITY_FLOOR = 0.9;
/** Meta: uma questão errada a cada 20. 90% é piso, não meta. */
export const QUALITY_TARGET = 0.95;
/** Amostra mínima para uma avaliação valer como decisão. Com menos, o portão não muda nada. */
export const MIN_SAMPLE = 30;

/** Intervalo de Wilson (95% por padrão). Funciona bem com amostra pequena e acerto perto de 100%. */
export function wilsonInterval(correct: number, total: number, z = 1.96) {
  if (total <= 0) return { low: 0, high: 0, rate: 0 };
  const p = correct / total;
  const z2 = z * z;
  const center = (p + z2 / (2 * total)) / (1 + z2 / total);
  const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / (1 + z2 / total);
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin), rate: p };
}

export type GateDecision = "liberado" | "plano_b" | "sem_medicao";

/**
 * Decisão do portão para um escopo, a partir da última avaliação humana das questões geradas.
 * Sem avaliação ou com amostra pequena: "sem_medicao" (segue o fluxo normal, com a conferência às cegas).
 */
export function qualityGate(score: { sample: number; correct: number } | null | undefined): GateDecision {
  if (!score || score.sample < MIN_SAMPLE) return "sem_medicao";
  return score.correct / score.sample < QUALITY_FLOOR ? "plano_b" : "liberado";
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1).replace(".", ",")}%`;
}

/** Linha de relatório: "92,3% (n = 120; IC 95%: 86,1% a 95,8%)". */
export function describeAccuracy(correct: number, total: number) {
  const { low, high, rate } = wilsonInterval(correct, total);
  return `${formatPercent(rate)} (n = ${total}; IC 95%: ${formatPercent(low)} a ${formatPercent(high)})`;
}
