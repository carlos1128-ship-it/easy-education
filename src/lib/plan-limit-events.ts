import type { PlanLimitCode, PlanLimitInfo } from "@/lib/plan-limits";

/** Evento do navegador que abre o modal de limite/upgrade (ouvido pelo PlanProvider no dashboard). */
export const PLAN_LIMIT_EVENT = "easy:plan-limit";

const CODES: readonly PlanLimitCode[] = ["limit_reached", "feature_locked", "daily_cap", "file_too_large"];

/** A resposta da API é um aviso de limite de plano (e não um erro qualquer)? */
export function isPlanLimitPayload(value: unknown): value is PlanLimitInfo & { error?: string } {
  if (!value || typeof value !== "object") return false;
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" && (CODES as readonly string[]).includes(code);
}

/** Pede para abrir o modal. Devolve true se algum ouvinte (o PlanProvider) assumiu a exibição. */
export function emitPlanLimit(info: PlanLimitInfo): boolean {
  if (typeof window === "undefined") return false;
  const detail = { info, handled: false };
  window.dispatchEvent(new CustomEvent(PLAN_LIMIT_EVENT, { detail }));
  return detail.handled;
}
