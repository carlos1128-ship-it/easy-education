import type { User } from "@supabase/supabase-js";
import { setAiCallContext } from "@/lib/ai-cost";
import { getAccessState } from "@/lib/billing";
import {
  FEATURES,
  FEATURE_KEYS,
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
import { getPrisma } from "@/lib/prisma";
import { describeReset, startOfDaySP, startOfWeekSP, windowReset, windowStart } from "@/lib/time-window";

type UserRef = Pick<User, "id" | "email">;

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

/** Limite atingido (429) ou recurso fora do plano (403). Vira JSON com os detalhes via apiErrorResponse. */
export class PlanLimitError extends Error {
  readonly status: number;
  constructor(readonly info: PlanLimitInfo) {
    super(info.message);
    this.name = "PlanLimitError";
    this.status = info.code === "feature_locked" ? 403 : info.code === "file_too_large" ? 413 : 429;
  }
}

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

function lockedInfo(tier: PlanTier, feature: FeatureKey): PlanLimitInfo {
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

function limitInfo(tier: PlanTier, feature: FeatureKey, status: Extract<AllowanceStatus, { state: "limit" }>, now: Date): PlanLimitInfo {
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

function dailyCapInfo(tier: PlanTier): PlanLimitInfo {
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

function fileTooLargeInfo(tier: PlanTier, bytes: number): PlanLimitInfo {
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

/** Recusa arquivo maior que o limite do plano (antes de gastar o uso diário de envios). */
export function assertUploadSize(tier: PlanTier, bytes: number) {
  if (bytes > PLANS[tier].uploadMaxBytes) throw new PlanLimitError(fileTooLargeInfo(tier, bytes));
}

/** Confere só os tetos globais de segurança do dia, sem gastar nenhum uso (para repetir tentativas, por exemplo). */
export async function assertWithinSafetyCaps(user: UserRef, options: { tier?: PlanTier } = {}) {
  const tier = options.tier ?? (await getAccessState(user)).tier;
  const plan = PLANS[tier];
  const dayStart = startOfDaySP();
  const prisma = getPrisma();
  const [day, cost] = await Promise.all([
    prisma.usageEvent.aggregate({ _sum: { units: true }, where: { userId: user.id, createdAt: { gte: dayStart } } }),
    prisma.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: dayStart } } }),
  ]);
  if ((day._sum.units ?? 0) >= plan.safety.dailyUnits || Number(cost._sum.costUsd ?? 0) >= plan.safety.dailyCostUsd) {
    throw new PlanLimitError(dailyCapInfo(tier));
  }
  setAiCallContext({ userId: user.id, plan: tier, feature: null });
}

/** Comprovante de um uso reservado. `refund` devolve o uso se a operação falhar depois. */
export type UsageTicket = {
  feature: FeatureKey;
  tier: PlanTier;
  /** Usos que sobram na janela depois deste (null se não há limite). */
  remaining: number | null;
  max: number | null;
  window: LimitWindow | null;
  resetAt: string | null;
  refund: () => Promise<void>;
};

const noopTicket = (feature: FeatureKey, tier: PlanTier): UsageTicket => ({
  feature,
  tier,
  remaining: null,
  max: null,
  window: null,
  resetAt: null,
  refund: async () => undefined,
});

/**
 * Reserva um uso do recurso para o aluno, no servidor. Lança PlanLimitError se o plano não permite
 * ou se o limite acabou. Chame ANTES de gastar IA ou armazenamento e use `ticket.refund()` se a operação falhar.
 *
 * O contador é protegido por um lock no banco (por aluno), então dois cliques ao mesmo tempo não passam do limite.
 */
export async function consumeFeature(user: UserRef, feature: FeatureKey, options: { tier?: PlanTier; amount?: number } = {}): Promise<UsageTicket> {
  const tier = options.tier ?? (await getAccessState(user)).tier;
  const plan = PLANS[tier];
  const allowance = plan.limits[feature];
  const meta = FEATURES[feature];
  const amount = options.amount ?? 1;
  const now = new Date();

  if (allowance.kind === "locked") throw new PlanLimitError(lockedInfo(tier, feature));
  setAiCallContext({ userId: user.id, plan: tier, feature });
  if (allowance.kind === "open") return noopTicket(feature, tier);

  const prisma = getPrisma();
  const dayStart = startOfDaySP(now);
  const since = windowStart(allowance.window, now);

  const result = await prisma.$transaction(async (tx) => {
    // Serializa os usos do mesmo aluno: a contagem e a gravação abaixo viram uma operação só.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`usage:${user.id}`}))`;

    const used = await tx.usageEvent.count({ where: { userId: user.id, feature, createdAt: { gte: since } } });
    const status = evaluateAllowance(allowance, used, now);
    if (status.state === "limit" && status.remaining < amount) {
      throw new PlanLimitError(limitInfo(tier, feature, status, now));
    }

    // Teto global de segurança do dia (peso dos recursos e custo estimado da IA).
    const units = meta.weight * amount;
    if (units > 0) {
      const day = await tx.usageEvent.aggregate({ _sum: { units: true }, where: { userId: user.id, createdAt: { gte: dayStart } } });
      if ((day._sum.units ?? 0) + units > plan.safety.dailyUnits) throw new PlanLimitError(dailyCapInfo(tier));
    }
    if (meta.usesAi) {
      const cost = await tx.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: dayStart } } });
      if (Number(cost._sum.costUsd ?? 0) >= plan.safety.dailyCostUsd) throw new PlanLimitError(dailyCapInfo(tier));
    }

    const created = await tx.usageEvent.createManyAndReturn({
      data: Array.from({ length: amount }, () => ({ userId: user.id, feature, units: meta.weight })),
      select: { id: true },
    });
    return { ids: created.map((item) => item.id), status, used: used + amount };
  });

  const status = result.status;
  const max = status.state === "limit" ? status.max : null;
  return {
    feature,
    tier,
    remaining: status.state === "limit" ? Math.max(0, status.max - result.used) : null,
    max,
    window: status.state === "limit" ? status.window : null,
    resetAt: status.state === "limit" ? status.resetAt.toISOString() : null,
    refund: async () => {
      await prisma.usageEvent.deleteMany({ where: { id: { in: result.ids } } }).catch((error: unknown) => {
        console.error("[usage] falha ao devolver uso", error);
      });
    },
  };
}

/**
 * Roda `run` depois de reservar o uso; se `run` falhar, o uso volta para o aluno.
 * É o jeito normal de proteger uma rota que gasta IA.
 */
export async function withFeature<T>(user: UserRef, feature: FeatureKey, run: (ticket: UsageTicket) => Promise<T>, options: { tier?: PlanTier } = {}): Promise<T> {
  const ticket = await consumeFeature(user, feature, options);
  try {
    return await run(ticket);
  } catch (error) {
    await ticket.refund();
    throw error;
  }
}

/** Confere se o recurso está liberado (e se ainda sobra uso) sem gastar nada. Lança PlanLimitError se não. */
export async function assertFeatureAvailable(user: UserRef, feature: FeatureKey, options: { tier?: PlanTier } = {}) {
  const tier = options.tier ?? (await getAccessState(user)).tier;
  const allowance = allowanceFor(tier, feature);
  if (allowance.kind === "locked") throw new PlanLimitError(lockedInfo(tier, feature));
  if (allowance.kind === "open") return;
  const now = new Date();
  const used = await getPrisma().usageEvent.count({
    where: { userId: user.id, feature, createdAt: { gte: windowStart(allowance.window, now) } },
  });
  const status = evaluateAllowance(allowance, used, now);
  if (status.state === "limit" && status.remaining < 1) throw new PlanLimitError(limitInfo(tier, feature, status, now));
}

export type FeatureUsage = {
  feature: FeatureKey;
  state: "open" | "locked" | "limit";
  max: number | null;
  used: number;
  remaining: number | null;
  window: LimitWindow | null;
  resetAt: string | null;
  /** Plano que libera ou amplia o recurso (para o cadeado e o botão de upgrade). */
  upgradeTo: PlanTier | null;
};

export type UsageSnapshot = { tier: PlanTier; features: Record<FeatureKey, FeatureUsage> };

/** Uso de todos os recursos do aluno: alimenta os avisos "restam X" e os cadeados. */
export async function getUsageSnapshot(user: UserRef, options: { tier?: PlanTier } = {}): Promise<UsageSnapshot> {
  const tier = options.tier ?? (await getAccessState(user)).tier;
  const now = new Date();
  const weekStart = startOfWeekSP(now);
  const events = await getPrisma().usageEvent.findMany({
    where: { userId: user.id, createdAt: { gte: weekStart } },
    select: { feature: true, createdAt: true },
  });

  const features = {} as Record<FeatureKey, FeatureUsage>;
  for (const feature of FEATURE_KEYS) {
    const allowance = allowanceFor(tier, feature);
    const used =
      allowance.kind === "limit"
        ? events.filter((event) => event.feature === feature && event.createdAt >= windowStart(allowance.window, now)).length
        : 0;
    const status = evaluateAllowance(allowance, used, now);
    features[feature] = {
      feature,
      state: status.state,
      max: status.state === "limit" ? status.max : null,
      used,
      remaining: status.state === "limit" ? status.remaining : null,
      window: status.state === "limit" ? status.window : null,
      resetAt: status.state === "limit" ? status.resetAt.toISOString() : null,
      upgradeTo: allowance.kind === "open" ? null : upgradeTargetFor(tier, feature),
    };
  }
  return { tier, features };
}
