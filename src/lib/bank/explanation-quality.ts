export const EXPLANATION_UNAVAILABLE = "A resolução comentada ainda não está disponível para esta questão.";

export function needsOfficialExplanation(explanation: string | null | undefined, correctLabel: string) {
  const value = explanation?.trim() ?? "";
  if (value.length < 30 || value === EXPLANATION_UNAVAILABLE) return true;
  return new RegExp(`^gabarito oficial da prova:\\s*alternativa ${correctLabel}\\.?$`, "i").test(value);
}

export function normalizeOfficialExplanation(value: string | null | undefined) {
  const explanation = value?.trim() ?? "";
  if (explanation.length < 30 || explanation.length > 2400) return null;
  if (/^(gabarito oficial|resposta correta|alternativa correta)\b/i.test(explanation)) return null;
  if (explanation.split(/(?<=[.!?])\s+/).length > 6) return null;
  return explanation;
}
