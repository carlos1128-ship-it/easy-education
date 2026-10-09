import { AsyncLocalStorage } from "node:async_hooks";
import { getPrisma } from "@/lib/prisma";

/**
 * Registro do custo estimado de cada chamada à IA (tabela ai_call_logs).
 * O contexto (aluno, plano, recurso) viaja pela requisição com AsyncLocalStorage: `consumeFeature` o define
 * e `gemini.ts` lê quando a resposta chega, sem precisar passar o aluno por todas as funções de geração.
 */

export type AiCallContext = { userId?: string | null; plan?: string | null; feature?: string | null };

const storage = new AsyncLocalStorage<AiCallContext>();

/** Define o contexto para o resto do fluxo assíncrono atual (a requisição). */
export function setAiCallContext(context: AiCallContext) {
  storage.enterWith(context);
}

/** Roda `fn` com um contexto próprio (tarefas em segundo plano e lotes). */
export function runWithAiCallContext<T>(context: AiCallContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(context, fn);
}

export function currentAiCallContext(): AiCallContext {
  return storage.getStore() ?? {};
}

/**
 * Preço por 1 milhão de tokens, em dólares (plano pago do Gemini). Confira a tabela do Google quando mudar de
 * modelo e ajuste aqui. Modelo desconhecido usa o preço padrão (o mais caro dos usados), para não subestimar custo.
 */
const PRICE_PER_MILLION: Array<{ prefix: string; input: number; output: number }> = [
  { prefix: "gemini-2.5-flash-lite", input: 0.1, output: 0.4 },
  { prefix: "gemini-2.5-flash", input: 0.3, output: 2.5 },
  { prefix: "gemini-3.1-flash-lite", input: 0.25, output: 1.5 },
  { prefix: "gemini-3.5-flash-lite", input: 0.3, output: 2.5 },
];
const DEFAULT_PRICE = { input: 0.3, output: 2.5 };

/** Margem para os pedidos-reserva que o app dispara quando um modelo demora (ver docs/consumo-ia.md). */
const SAFETY_MARGIN = 1.15;

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_PER_MILLION.find((item) => model.startsWith(item.prefix)) ?? DEFAULT_PRICE;
  return ((inputTokens * price.input + outputTokens * price.output) / 1_000_000) * SAFETY_MARGIN;
}

export type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
};

/** Grava a chamada. Nunca derruba a requisição: se o banco falhar, só registra no log do servidor. */
export async function recordAiCall(model: string, usage: GeminiUsage | undefined | null) {
  try {
    const inputTokens = (usage?.promptTokenCount ?? 0) + (usage?.toolUsePromptTokenCount ?? 0);
    // Tokens de raciocínio são cobrados como saída.
    const outputTokens = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
    const context = currentAiCallContext();
    await getPrisma().aiCallLog.create({
      data: {
        userId: context.userId ?? null,
        plan: context.plan ?? null,
        feature: context.feature ?? null,
        model,
        inputTokens,
        outputTokens,
        costUsd: estimateCostUsd(model, inputTokens, outputTokens),
      },
    });
  } catch (error) {
    console.error("[ai-cost] falha ao registrar chamada", error);
  }
}
