import type { User } from "@supabase/supabase-js";
import { setAiCallContext } from "@/lib/ai-cost";
import { getAccessState } from "@/lib/billing";
import {
  dailyCapInfo,
  evaluateAllowance,
  monthlyCapInfo,
  fileTooLargeInfo,
  limitInfo,
  lockedInfo,
  type PlanLimitInfo,
} from "@/lib/plan-limits";
import { FEATURES, FEATURE_KEYS, PLANS, allowanceFor, upgradeTargetFor, type FeatureKey, type LimitWindow, type PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { startOfDaySP, startOfMonthSP, startOfWeekSP, windowStart } from "@/lib/time-window";

export { evaluateAllowance, type PlanLimitCode, type PlanLimitInfo } from "@/lib/plan-limits";

type UserRef = Pick<User, "id" | "email">;

/** Limite atingido (429) ou recurso fora do plano (403). Vira JSON com os detalhes via apiErrorResponse. */
export class PlanLimitError extends Error {
  readonly status: number;
  constructor(readonly info: PlanLimitInfo) {
    super(info.message);
    this.name = "PlanLimitError";
    this.status = info.code === "feature_locked" ? 403 : info.code === "file_too_large" ? 413 : 429;
  }
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
  const [day, cost, month] = await Promise.all([
    prisma.usageEvent.aggregate({ _sum: { units: true }, where: { userId: user.id, createdAt: { gte: dayStart } } }),
    prisma.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: dayStart } } }),
    prisma.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: startOfMonthSP() } } }),
  ]);
  if (Number(month._sum.costUsd ?? 0) >= plan.safety.monthlyCostUsd) throw new PlanLimitError(monthlyCapInfo(tier));
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
      const [today, month] = await Promise.all([
        tx.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: dayStart } } }),
        tx.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { userId: user.id, createdAt: { gte: startOfMonthSP(now) } } }),
      ]);
      if (Number(month._sum.costUsd ?? 0) >= plan.safety.monthlyCostUsd) throw new PlanLimitError(monthlyCapInfo(tier));
      if (Number(today._sum.costUsd ?? 0) >= plan.safety.dailyCostUsd) throw new PlanLimitError(dailyCapInfo(tier));
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
