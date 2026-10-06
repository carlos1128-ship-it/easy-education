import type { User } from "@supabase/supabase-js";
import { assertActiveSubscription } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/study-stats";
import type { PlanId } from "@/lib/stripe";

/**
 * Limite diário de uso da IA por aluno, contado no banco (vale para todas as instâncias da Vercel,
 * diferente do limite por minuto, que fica na memória). Protege o custo da API contra abuso.
 * O plano Completo tem os limites maiores; o Básico, o limite padrão.
 */
const LIMITS: Record<PlanId, { generation: number; chat: number }> = {
  basic: {
    generation: Number(process.env.AI_DAILY_GENERATIONS_BASIC ?? 25),
    chat: Number(process.env.AI_DAILY_CHAT_MESSAGES_BASIC ?? 60),
  },
  full: {
    generation: Number(process.env.AI_DAILY_GENERATIONS ?? 60),
    chat: Number(process.env.AI_DAILY_CHAT_MESSAGES ?? 150),
  },
};

export class AiQuotaError extends Error {
  readonly status = 429;
}

/** Exige assinatura ativa e confere o limite do dia do plano do aluno. */
export async function assertDailyAiQuota(user: Pick<User, "id" | "email">, kind: "generation" | "chat") {
  const access = await assertActiveSubscription(user);
  const limits = LIMITS[access.plan ?? "full"];
  const userId = user.id;
  const prisma = getPrisma();
  const since = startOfToday();
  if (kind === "chat") {
    const messages = await prisma.chatMessage.count({ where: { userId, role: "user", createdAt: { gte: since } } });
    if (messages >= limits.chat) throw new AiQuotaError(quotaMessage("mensagens do chat", access.plan));
    return;
  }
  const [quizzes, decks, essays, plans] = await Promise.all([
    prisma.quiz.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.flashcardDeck.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.essay.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.studyPlan.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  if (quizzes + decks + essays + plans >= limits.generation) {
    throw new AiQuotaError(quotaMessage("gerações com IA", access.plan));
  }
}

function quotaMessage(what: string, plan: PlanId | null) {
  const upgrade = plan === "basic" ? " Para usar mais, mude para o plano Completo em Assinatura." : "";
  return `Você chegou ao limite de ${what} por hoje. Volte amanhã!${upgrade}`;
}
