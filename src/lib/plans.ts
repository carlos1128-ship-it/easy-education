/**
 * Planos, preços e limites de uso. É o ÚNICO lugar com esses números: servidor, telas e página de
 * preços leem daqui. Para ajustar um limite, mude só o valor abaixo.
 *
 * Regras de produto:
 * - Não existe plano gratuito (desde 10/10/2026): o aluno começa com TRIAL_DAYS dias grátis de um plano pago,
 *   autorizando o pagamento no início (cartão hoje; Pix Automático quando houver gateway, ver payment-methods.ts).
 *   Sem assinatura ou teste em vigor, o app manda para /assinar e as rotas de IA recusam.
 * - Todo limite é aplicado no servidor (`consumeFeature` em src/lib/usage.ts), nunca só na interface.
 * - Nunca escrever "ilimitado" na interface se existir qualquer teto.
 * - Janela diária: meia-noite de Brasília (America/Sao_Paulo). Semanal: segunda-feira, 00:00 de Brasília.
 */

export type PlanTier = "basic" | "full";

export const PLAN_ORDER: readonly PlanTier[] = ["basic", "full"];

/** Teste grátis, uma vez por aluno. O pagamento é autorizado no início e a 1ª cobrança vem no fim do teste. */
export const TRIAL_DAYS = 7;

export type LimitWindow = "day" | "week";

/** O que cada plano permite para um recurso. */
export type Allowance =
  | { kind: "open" }
  | { kind: "locked" }
  | { kind: "limit"; max: number; window: LimitWindow };

const open: Allowance = { kind: "open" };
const perDay = (max: number): Allowance => ({ kind: "limit", max, window: "day" });
const perWeek = (max: number): Allowance => ({ kind: "limit", max, window: "week" });

export type FeatureKey =
  | "chat_message"
  | "essay_correction"
  | "essay_photo_read"
  | "file_upload"
  | "video_material"
  | "study_plan"
  | "trail"
  | "ai_quiz"
  | "ai_flashcards"
  | "ai_simulado"
  | "day_summary";

export type FeatureMeta = {
  /** Nome curto, para botões e cadeados. */
  label: string;
  /** "3 mensagens", "1 redação": substantivo no singular e no plural, para frases como "Restam 2 mensagens hoje". */
  singular: string;
  plural: string;
  /** O que o recurso libera, para o modal de upgrade. */
  unlocks: string;
  /** Peso no teto global de segurança do dia (recursos mais caros pesam mais). */
  weight: number;
  /** Gasta IA (conta no teto de custo diário). */
  usesAi: boolean;
};

export const FEATURES: Record<FeatureKey, FeatureMeta> = {
  chat_message: {
    label: "Chat com IA",
    singular: "mensagem no chat",
    plural: "mensagens no chat",
    unlocks: "conversar mais com a IA de estudos",
    weight: 1,
    usesAi: true,
  },
  essay_correction: {
    label: "Correção de redação",
    singular: "correção de redação",
    plural: "correções de redação",
    unlocks: "corrigir mais redações com feedback por competência",
    weight: 3,
    usesAi: true,
  },
  essay_photo_read: {
    label: "Redação por foto",
    singular: "leitura de foto de redação",
    plural: "leituras de foto de redação",
    unlocks: "corrigir redação escrita à mão, a partir de uma foto",
    weight: 1,
    usesAi: true,
  },
  file_upload: {
    label: "Envio de arquivos",
    singular: "arquivo enviado",
    plural: "arquivos enviados",
    unlocks: "enviar mais arquivos e arquivos maiores",
    weight: 1,
    usesAi: false,
  },
  video_material: {
    label: "Vídeos do YouTube",
    singular: "vídeo do YouTube",
    plural: "vídeos do YouTube",
    unlocks: "estudar a partir de vídeos do YouTube",
    weight: 8,
    usesAi: true,
  },
  study_plan: {
    label: "Plano de estudos",
    singular: "plano de estudos novo",
    plural: "planos de estudos novos",
    unlocks: "criar mais planos de estudos",
    weight: 2,
    usesAi: true,
  },
  trail: {
    label: "Trilha de estudos",
    singular: "trilha",
    plural: "trilha",
    unlocks: "a trilha de estudos com fases e troféus",
    weight: 0,
    usesAi: false,
  },
  ai_quiz: {
    label: "Quiz gerado por IA",
    singular: "quiz gerado por IA",
    plural: "quizzes gerados por IA",
    unlocks: "gerar quizzes com IA sobre qualquer assunto ou material seu",
    weight: 3,
    usesAi: true,
  },
  ai_flashcards: {
    label: "Flashcards gerados por IA",
    singular: "deck de flashcards gerado por IA",
    plural: "decks de flashcards gerados por IA",
    unlocks: "gerar flashcards com IA a partir de qualquer assunto ou material",
    weight: 2,
    usesAi: true,
  },
  ai_simulado: {
    label: "Simulado gerado por IA",
    singular: "questão de simulado gerada por IA",
    plural: "questões de simulado geradas por IA",
    unlocks: "gerar simulados com IA no estilo da sua prova, inclusive o simulado do seu concurso",
    // Contado por questão; o custo fica coberto pelos tetos de custo do dia e do mês.
    weight: 0,
    usesAi: true,
  },
  day_summary: {
    label: "Resumo do dia corrigido",
    singular: "resumo do dia corrigido",
    plural: "resumos do dia corrigidos",
    unlocks: "fechar o dia com um resumo corrigido pela IA",
    // ~US$ 0,0009 por correção no flash-lite (ver docs/consumo-ia.md).
    weight: 1,
    usesAi: true,
  },
};

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];

const MB = 1024 * 1024;

export type PlanConfig = {
  id: PlanTier;
  name: string;
  /** Preço mensal em centavos de real. */
  priceCents: number;
  /** Frase curta para cartões de plano. */
  tagline: string;
  limits: Record<FeatureKey, Allowance>;
  /** Tamanho máximo de cada arquivo enviado. */
  uploadMaxBytes: number;
  /**
   * Maior trecho de vídeo do YouTube por envio, em minutos, quando o vídeo NÃO tem legenda (a IA precisa assistir,
   * o que custa caro). Com legenda, aceita até VIDEO_MAX_MINUTES (youtube.ts), porque a IA só resume o texto.
   */
  videoMaxMinutes: number;
  /**
   * Tetos globais de segurança por aluno por dia. Servem para um bug ou abuso não gerar uma conta enorme;
   * ficam bem acima do uso normal de cada plano.
   */
  safety: {
    /** Soma dos pesos (FEATURES[x].weight) de tudo o que foi usado no dia. */
    dailyUnits: number;
    /** Custo estimado de IA no dia, em dólares (soma de ai_call_logs). */
    dailyCostUsd: number;
    /**
     * Custo estimado de IA no mês, em dólares. É o teto de "uso justo": mesmo usando todos os limites diários
     * todos os dias, o gasto de IA de um aluno não passa deste valor (ver docs/consumo-ia.md).
     */
    monthlyCostUsd: number;
  };
};

export const PLANS: Record<PlanTier, PlanConfig> = {
  basic: {
    id: "basic",
    name: "Básico",
    priceCents: 1990,
    tagline: "Para estudar com IA todo dia, no seu ritmo. Começa com 7 dias grátis.",
    limits: {
      chat_message: perDay(12),
      essay_correction: perWeek(3),
      // Redação por foto entra no limite de redações; este é só o teto técnico de leituras (2x o limite de redações).
      essay_photo_read: perWeek(6),
      file_upload: perDay(2),
      // Vídeo com legenda sai barato (a IA resume o texto); sem legenda, o trecho fica limitado (videoMaxMinutes).
      video_material: perDay(1),
      study_plan: perWeek(1),
      trail: open,
      ai_quiz: perDay(10),
      ai_flashcards: perDay(25),
      // Simulado por IA é contado em QUESTÕES por dia: cabe um simulado da ETEC (50) ou vários menores.
      ai_simulado: perDay(50),
      day_summary: perDay(1),
    },
    uploadMaxBytes: 15 * MB,
    videoMaxMinutes: 20,
    // Teto de custo de uso justo: R$ 4,90 por mês (US$ 0,85). Questões reaproveitadas de outros alunos não gastam IA.
    safety: { dailyUnits: 400, dailyCostUsd: 0.2, monthlyCostUsd: 0.85 },
  },
  full: {
    id: "full",
    name: "Completo",
    priceCents: 3490,
    tagline: "Para quem estuda pesado e quer o limite mais alto.",
    limits: {
      chat_message: perDay(30),
      essay_correction: perDay(1),
      essay_photo_read: perDay(2),
      file_upload: perDay(5),
      video_material: perDay(3),
      study_plan: perWeek(3),
      trail: open,
      ai_quiz: perDay(20),
      ai_flashcards: perDay(50),
      // Simulado por IA é contado em QUESTÕES por dia (um simulado de 90 ou vários menores).
      ai_simulado: perDay(90),
      day_summary: perDay(1),
    },
    uploadMaxBytes: 50 * MB,
    videoMaxMinutes: 30,
    // Teto de custo de uso justo: R$ 14,90 por mês (US$ 2,62). Questões reaproveitadas de outros alunos não gastam IA.
    safety: { dailyUnits: 800, dailyCostUsd: 0.5, monthlyCostUsd: 2.62 },
  },
};

export function isPlanTier(value: unknown): value is PlanTier {
  return value === "basic" || value === "full";
}

export function allowanceFor(tier: PlanTier, feature: FeatureKey): Allowance {
  return PLANS[tier].limits[feature];
}

/** Próximo plano acima (Básico → Completo). O Completo não tem upgrade. */
export function nextTier(tier: PlanTier): PlanTier | null {
  const index = PLAN_ORDER.indexOf(tier);
  return PLAN_ORDER[index + 1] ?? null;
}

/**
 * Primeiro plano acima do atual que libera o recurso (ou o que dá mais uso, quando já está liberado).
 * É o que o botão de upgrade oferece.
 */
export function upgradeTargetFor(tier: PlanTier, feature: FeatureKey): PlanTier | null {
  const current = allowanceFor(tier, feature);
  for (const candidate of PLAN_ORDER.slice(PLAN_ORDER.indexOf(tier) + 1)) {
    const next = allowanceFor(candidate, feature);
    if (next.kind === "open") return candidate;
    if (next.kind === "limit" && (current.kind === "locked" || (current.kind === "limit" && capacityPerDay(next) > capacityPerDay(current)))) {
      return candidate;
    }
  }
  return null;
}

/** Usos por dia equivalentes, só para comparar limites diários com semanais. */
export function capacityPerDay(allowance: Allowance): number {
  if (allowance.kind === "open") return Number.POSITIVE_INFINITY;
  if (allowance.kind === "locked") return 0;
  return allowance.window === "week" ? allowance.max / 7 : allowance.max;
}

export function formatPriceBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function planPriceLabel(tier: PlanTier): string {
  return formatPriceBRL(PLANS[tier].priceCents);
}

export function windowLabel(window: LimitWindow): string {
  return window === "day" ? "por dia" : "por semana";
}

/** "3 mensagens no chat por dia", "1 correção de redação por semana"; recurso fechado vira null. */
export function describeAllowance(feature: FeatureKey, allowance: Allowance): string | null {
  if (allowance.kind === "locked") return null;
  const meta = FEATURES[feature];
  if (allowance.kind === "open") return meta.label;
  const noun = allowance.max === 1 ? meta.singular : meta.plural;
  return `${allowance.max} ${noun} ${windowLabel(allowance.window)}`;
}

/** Tamanho em MB para mostrar na interface. */
export function uploadLimitMB(tier: PlanTier): number {
  return Math.round(PLANS[tier].uploadMaxBytes / MB);
}
