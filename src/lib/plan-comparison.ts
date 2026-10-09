import { PLANS, PLAN_ORDER, allowanceFor, capacityPerDay, formatPriceBRL, type FeatureKey, type PlanTier } from "@/lib/plans";

/**
 * Linhas da tabela comparativa de planos (página de preços, tela de assinatura e landing).
 * Sem números de limite na interface: cada plano aparece como um nível de uso ("Incluído", "Mais uso",
 * "Uso máximo"), calculado a partir de plans.ts, então a tabela nunca fica diferente do que o servidor aplica.
 * `null` = o plano não inclui (a tabela mostra o cadeado).
 */
export type ComparisonRow = {
  id: string;
  label: string;
  values: Record<PlanTier, string | null>;
};

const INCLUDED = "Incluído";

function everyone(id: string, label: string, text = INCLUDED): ComparisonRow {
  return { id, label, values: { free: text, basic: text, full: text } };
}

/**
 * Nível do plano para o recurso, comparando com os outros planos que também o têm:
 * só um plano tem (ou todos iguais) → "Incluído"; senão o menor é "Incluído", o maior "Uso máximo" e o do meio "Mais uso".
 */
export function usageLevel(feature: FeatureKey, tier: PlanTier): string | null {
  const allowance = allowanceFor(tier, feature);
  if (allowance.kind === "locked") return null;
  if (allowance.kind === "open") return INCLUDED;
  const capacities = [...new Set(PLAN_ORDER.map((item) => capacityPerDay(allowanceFor(item, feature))).filter((value) => value > 0))].sort((a, b) => a - b);
  if (capacities.length <= 1) return INCLUDED;
  const rank = capacities.indexOf(capacityPerDay(allowance));
  if (rank === capacities.length - 1) return "Uso máximo";
  return rank === 0 ? INCLUDED : "Mais uso";
}

function levelRow(id: string, label: string, feature: FeatureKey): ComparisonRow {
  const values = {} as Record<PlanTier, string | null>;
  for (const tier of PLAN_ORDER) values[tier] = usageLevel(feature, tier);
  return { id, label, values };
}

export function comparisonRows(): ComparisonRow[] {
  return [
    everyone("simulados", "Simulados com provas anteriores do ENEM (para quem estuda para o ENEM)"),
    everyone("performance", "Desempenho e estatísticas"),
    everyone("review", "Revisão das questões que você errou nos simulados"),
    levelRow("chat", "Chat com IA", "chat_message"),
    levelRow("essay", "Correção de redação", "essay_correction"),
    {
      id: "essay_photo",
      label: "Redação por foto",
      values: {
        free: allowanceFor("free", "essay_photo_read").kind === "locked" ? null : INCLUDED,
        basic: allowanceFor("basic", "essay_photo_read").kind === "locked" ? null : INCLUDED,
        full: allowanceFor("full", "essay_photo_read").kind === "locked" ? null : INCLUDED,
      },
    },
    levelRow("upload", "Envio de arquivos (PDF, texto, foto)", "file_upload"),
    levelRow("video", "Estudar com vídeos do YouTube", "video_material"),
    levelRow("plan", "Plano de estudos", "study_plan"),
    levelRow("trail", "Trilha de estudos com troféus", "trail"),
    levelRow("ai_quiz", "Quizzes gerados por IA", "ai_quiz"),
    levelRow("ai_flashcards", "Flashcards gerados por IA", "ai_flashcards"),
    levelRow("ai_simulado", "Simulados gerados por IA (inclui o simulado do seu concurso)", "ai_simulado"),
  ];
}

/** O que mais pesa na escolha, para o cartão de cada plano (sem números de limite). */
const HIGHLIGHTS: Record<PlanTier, string[]> = {
  free: ["Simulados com provas anteriores do ENEM", "Painel de desempenho", "Revisão das questões que você errou", "Seu primeiro plano de estudos"],
  basic: ["Chat com IA para tirar dúvidas", "Correção de redação, também por foto", "Quizzes, flashcards e simulados com IA", "Estudar com seus arquivos e vídeos do YouTube"],
  full: ["O maior uso de IA do app", "Simulado com IA todo dia", "Mais vídeos e arquivos maiores", "Redação e plano com a IA mais avançada"],
};

export function planHighlights(tier: PlanTier): string[] {
  return HIGHLIGHTS[tier];
}

/** "R$ 19,90" por mês e quanto dá por dia (sem arredondar para baixo, para não prometer o que não é). */
export function pricePerDayLabel(tier: PlanTier): string | null {
  const cents = PLANS[tier].priceCents;
  if (cents === 0) return null;
  const perDay = cents / 100 / 30;
  return perDay < 1 ? "Menos de R$ 1 por dia" : `Cerca de ${formatPriceBRL(Math.round(perDay * 100))} por dia`;
}
