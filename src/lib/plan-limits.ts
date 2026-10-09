import {
  FEATURES,
  PLANS,
  allowanceFor,
  describeAllowance,
  nextTier,
  upgradeTargetFor,
  uploadLimitMB,
  type Allowance,
  type FeatureKey,
  type LimitWindow,
  type PlanTier,
} from "@/lib/plans";
import { describeReset, windowReset } from "@/lib/time-window";

/**
 * Regras e textos dos limites de plano, sem nada de servidor: o navegador usa as mesmas funções
 * para abrir o modal de upgrade quando o aluno clica num cadeado.
 */

export type PlanLimitCode = "limit_reached" | "feature_locked" | "daily_cap" | "file_too_large";

/** Tudo o que a interface precisa para explicar um limite e oferecer o upgrade. */
export type PlanLimitInfo = {
  code: PlanLimitCode;
  feature: FeatureKey | null;
  tier: PlanTier;
  /** Máximo do plano atual na janela (limit_reached). */
  limit?: number;
  window?: LimitWindow;
  /** Quando o uso volta (ISO). */
  resetAt?: string;
  /** Plano que resolve (null se o aluno já está no mais alto). */
  upgradeTo: PlanTier | null;
  /** O que o plano de cima oferece para este recurso, em texto ("20 mensagens no chat por dia"). */
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
    upgradeOffer: target ? (describeAllowance(feature, allowanceFor(target, feature)) ?? undefined) : undefined,
    message: targetName
      ? `${meta.label} não está disponível no plano ${PLANS[tier].name}. No plano ${targetName} você libera ${meta.unlocks}.`
      : `${meta.label} não está disponível no seu plano.`,
  };
}

export function limitInfo(tier: PlanTier, feature: FeatureKey, status: Extract<AllowanceStatus, { state: "limit" }>, now: Date): PlanLimitInfo {
  const meta = FEATURES[feature];
  const target = upgradeTargetFor(tier, feature);
  const offer = target ? describeAllowance(feature, allowanceFor(target, feature)) : null;
  const period = status.window === "day" ? "de hoje" : "desta semana";
  const noun = status.max === 1 ? meta.singular : meta.plural;
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
      `Você usou ${status.max} ${noun} ${period} no plano ${PLANS[tier].name}. ` +
      `O limite volta ${describeReset(status.window, now)} (horário de Brasília).` +
      (target && offer ? ` No plano ${PLANS[target].name} você tem ${offer}.` : ""),
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
    message: `Você chegou ao limite de segurança de uso de hoje. Ele volta ${describeReset("day")} (horário de Brasília).`,
  };
}

export function fileTooLargeInfo(tier: PlanTier, bytes: number): PlanLimitInfo {
  const target = upgradeTargetFor(tier, "file_upload") ?? nextTier(tier);
  const upgradeOffer = target ? `arquivos de até ${uploadLimitMB(target)} MB` : undefined;
  const mb = (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
  return {
    code: "file_too_large",
    feature: "file_upload",
    tier,
    upgradeTo: target,
    upgradeOffer,
    message:
      `Este arquivo tem ${mb} MB e o plano ${PLANS[tier].name} aceita até ${uploadLimitMB(tier)} MB por arquivo.` +
      (target ? ` No plano ${PLANS[target].name} o limite é de ${uploadLimitMB(target)} MB.` : ""),
  };
}
