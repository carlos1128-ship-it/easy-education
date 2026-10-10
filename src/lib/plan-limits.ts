import {
  FEATURES,
  PLANS,
  nextTier,
  upgradeTargetFor,
  type Allowance,
  type FeatureKey,
  type LimitWindow,
  type PlanTier,
} from "@/lib/plans";
import { describeReset, startOfNextMonthSP, windowReset } from "@/lib/time-window";

/**
 * Regras e textos dos limites de plano, sem nada de servidor: o navegador usa as mesmas funções
 * para abrir o modal de upgrade quando o aluno clica num cadeado.
 */

export type PlanLimitCode = "limit_reached" | "feature_locked" | "daily_cap" | "monthly_cap" | "file_too_large" | "subscription_required";

/** Tudo o que a interface precisa para explicar um limite e oferecer o upgrade. */
export type PlanLimitInfo = {
  code: PlanLimitCode;
  feature: FeatureKey | null;
  /** Plano atual (null: sem assinatura nem teste em vigor). */
  tier: PlanTier | null;
  /** Máximo do plano atual na janela (limit_reached). */
  limit?: number;
  window?: LimitWindow;
  /** Quando o uso volta (ISO). */
  resetAt?: string;
  /** Plano que resolve (null se o aluno já está no mais alto). */
  upgradeTo: PlanTier | null;
  /** O que o plano de cima oferece para este recurso, em texto, sem números ("mais mensagens no chat"). */
  upgradeOffer?: string;
  message: string;
};

/** Resultado puro da conta de um limite; separado do banco para testar sem ele. */
export type AllowanceStatus =
  | { state: "open" }
  | { state: "locked" }
  | { state: "limit"; max: number; used: number; remaining: number; window: LimitWindow; resetAt: Date };

export function evaluateAllowance(allowance: Allowance, used: number, now: Date = new Date()): AllowanceStatus {
  if (allowance.kind === "open") return { state: "open" };
  if (allowance.kind === "locked") return { state: "locked" };
  return {
    state: "limit",
    max: allowance.max,
    used,
    remaining: Math.max(0, allowance.max - used),
    window: allowance.window,
    resetAt: windowReset(allowance.window, now),
  };
}

export function lockedInfo(tier: PlanTier, feature: FeatureKey): PlanLimitInfo {
  const meta = FEATURES[feature];
  const target = upgradeTargetFor(tier, feature);
  const targetName = target ? PLANS[target].name : null;
  return {
    code: "feature_locked",
    feature,
    tier,
    upgradeTo: target,
    upgradeOffer: target ? meta.unlocks : undefined,
    message: targetName
      ? `${meta.label} não está disponível no plano ${PLANS[tier].name}. No plano ${targetName} você libera ${meta.unlocks}.`
      : `${meta.label} não está disponível no seu plano.`,
  };
}

export function limitInfo(tier: PlanTier, feature: FeatureKey, status: Extract<AllowanceStatus, { state: "limit" }>, now: Date, requested = 1): PlanLimitInfo {
  const meta = FEATURES[feature];
  const target = upgradeTargetFor(tier, feature);
  const offer = target ? `mais ${meta.plural}` : null;
  const period = status.window === "day" ? "de hoje" : "desta semana";
  return {
    code: "limit_reached",
    feature,
    tier,
    limit: status.max,
    window: status.window,
    resetAt: status.resetAt.toISOString(),
    upgradeTo: target,
    upgradeOffer: offer ?? undefined,
    message:
      // Ainda sobra um pouco, mas não o suficiente para o pedido (ex.: simulado grande demais para o que resta hoje).
      (status.remaining > 0 && requested > status.remaining
        ? `Você não tem ${meta.plural} suficientes ${period} para um pedido deste tamanho. Escolha um simulado menor ou espere: `
        : `Você usou todo o seu limite de ${meta.plural} ${period} no plano ${PLANS[tier].name}. `) +
      `Ele volta ${describeReset(status.window, now)}.` +
      (target && offer ? ` No plano ${PLANS[target].name} você tem ${offer}.` : ""),
  };
}

/** Sem assinatura nem teste em vigor: nada de IA. O modal leva para /assinar (7 dias grátis na 1ª vez). */
export function subscriptionRequiredInfo(feature: FeatureKey | null = null): PlanLimitInfo {
  return {
    code: "subscription_required",
    feature,
    tier: null,
    upgradeTo: "basic",
    upgradeOffer: feature ? FEATURES[feature].unlocks : undefined,
    message: "Para usar a IA, escolha um plano. A primeira assinatura começa com 7 dias grátis.",
  };
}

export function monthlyCapInfo(tier: PlanTier): PlanLimitInfo {
  const reset = startOfNextMonthSP();
  return {
    code: "monthly_cap",
    feature: null,
    tier,
    window: "week",
    resetAt: reset.toISOString(),
    upgradeTo: nextTier(tier),
    message: `Você chegou ao teto de uso justo de IA deste mês no plano ${PLANS[tier].name}. Ele volta no começo do mês que vem.`,
  };
}

export function dailyCapInfo(tier: PlanTier): PlanLimitInfo {
  return {
    code: "daily_cap",
    feature: null,
    tier,
    window: "day",
    resetAt: windowReset("day").toISOString(),
    upgradeTo: nextTier(tier),
    message: `Você chegou ao limite de segurança de uso de hoje. Ele volta ${describeReset("day")}.`,
  };
}

export function fileTooLargeInfo(tier: PlanTier): PlanLimitInfo {
  const target = upgradeTargetFor(tier, "file_upload") ?? nextTier(tier);
  const upgradeOffer = target ? "arquivos maiores" : undefined;
  return {
    code: "file_too_large",
    feature: "file_upload",
    tier,
    upgradeTo: target,
    upgradeOffer,
    message:
      `Este arquivo é maior do que o plano ${PLANS[tier].name} aceita.` +
      (target ? ` No plano ${PLANS[target].name} você envia arquivos maiores.` : " Tente um arquivo menor ou divida em partes."),
  };
}
