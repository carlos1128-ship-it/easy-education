import {
  PLANS,
  PLAN_ORDER,
  allowanceFor,
  describeAllowance,
  formatPriceBRL,
  uploadLimitMB,
  type FeatureKey,
  type PlanTier,
} from "@/lib/plans";

/**
 * Linhas da tabela comparativa de planos (página de preços, tela de assinatura e landing).
 * Os números vêm de plans.ts, então a tabela nunca fica diferente do que o servidor aplica.
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

/** Só a quantidade ("3 por dia"), sem repetir o nome do recurso que já está na coluna da esquerda. */
function amount(feature: FeatureKey, tier: PlanTier): string | null {
  const allowance = allowanceFor(tier, feature);
  if (allowance.kind === "locked") return null;
  if (allowance.kind === "open") return INCLUDED;
  return `${allowance.max} ${allowance.window === "day" ? "por dia" : "por semana"}`;
}

function amountRow(id: string, label: string, feature: FeatureKey, suffix?: (tier: PlanTier) => string): ComparisonRow {
  const values = {} as Record<PlanTier, string | null>;
  for (const tier of PLAN_ORDER) {
    const text = amount(feature, tier);
    values[tier] = text === null ? null : `${text}${suffix ? suffix(tier) : ""}`;
  }
  return { id, label, values };
}

export function comparisonRows(): ComparisonRow[] {
  return [
    everyone("simulados", "Simulados com provas anteriores do ENEM (para quem estuda para o ENEM)"),
    everyone("performance", "Desempenho e estatísticas"),
    everyone("review", "Revisão das questões que você errou nos simulados"),
    amountRow("chat", "Mensagens no chat com IA", "chat_message"),
    amountRow("essay", "Correção de redação por texto", "essay_correction"),
    {
      id: "essay_photo",
      label: "Correção de redação por foto",
      values: {
        free: allowanceFor("free", "essay_photo_read").kind === "locked" ? null : "Dentro do limite de redações",
        basic: allowanceFor("basic", "essay_photo_read").kind === "locked" ? null : "Dentro do limite de redações",
        full: allowanceFor("full", "essay_photo_read").kind === "locked" ? null : "Dentro do limite de redações",
      },
    },
    amountRow("upload", "Envio de arquivos (PDF, texto, foto)", "file_upload", (tier) => `, até ${uploadLimitMB(tier)} MB cada`),
    amountRow("video", "Estudar com vídeos do YouTube", "video_material"),
    amountRow("plan", "Criar plano de estudos", "study_plan"),
    amountRow("trail", "Trilha de estudos com troféus", "trail"),
    amountRow("ai_quiz", "Quizzes gerados por IA", "ai_quiz"),
    {
      id: "ai_flashcards",
      label: "Flashcards",
      values: {
        free: "Revisão das questões que você respondeu",
        basic: `Revisão + gerados por IA (${amount("ai_flashcards", "basic")})`,
        full: `Revisão + gerados por IA (${amount("ai_flashcards", "full")})`,
      },
    },
    amountRow("ai_simulado", "Simulados gerados por IA (inclui o simulado do seu concurso)", "ai_simulado"),
  ];
}

/** Os 4 números que mais pesam na escolha, para o cartão de cada plano. */
export function planHighlights(tier: PlanTier): string[] {
  const upload = allowanceFor(tier, "file_upload");
  return [
    describeAllowance("chat_message", allowanceFor(tier, "chat_message")),
    describeAllowance("essay_correction", allowanceFor(tier, "essay_correction")),
    upload.kind === "limit" ? `${upload.max} ${upload.max === 1 ? "arquivo enviado" : "arquivos enviados"} por dia, até ${uploadLimitMB(tier)} MB` : null,
    describeAllowance("study_plan", allowanceFor(tier, "study_plan")),
  ].filter((item): item is string => Boolean(item));
}

/** "R$ 19,90" por mês e quanto dá por dia (sem arredondar para baixo, para não prometer o que não é). */
export function pricePerDayLabel(tier: PlanTier): string | null {
  const cents = PLANS[tier].priceCents;
  if (cents === 0) return null;
  const perDay = cents / 100 / 30;
  return perDay < 1 ? "Menos de R$ 1 por dia" : `Cerca de ${formatPriceBRL(Math.round(perDay * 100))} por dia`;
}

