import { emitPlanLimit, isPlanLimitPayload } from "@/lib/plan-limit-events";

export async function readApiJson<T extends Record<string, unknown>>(
  response: Response,
  fallbackError: string,
): Promise<T & { error?: string }> {
  const text = await response.text();

  if (!text.trim()) {
    return { error: response.ok ? undefined : fallbackError } as T & { error?: string };
  }

  try {
    const parsed = JSON.parse(text) as T & { error?: string };
    // Limite de plano ou recurso fora do plano: abre o modal de upgrade e deixa o aviso do formulário curto.
    if (!response.ok && isPlanLimitPayload(parsed) && emitPlanLimit(parsed)) {
      return { ...parsed, error: "Limite do plano atingido." } as T & { error?: string };
    }
    return parsed;
  } catch {
    return {
      error: fallbackError,
    } as T & { error?: string };
  }
}
