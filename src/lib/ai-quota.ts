import { getPrisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/study-stats";

/**
 * Limite diário de uso da IA por aluno, contado no banco (vale para todas as instâncias da Vercel,
 * diferente do limite por minuto, que fica na memória). Protege o custo da API contra abuso.
 */
const DAILY_GENERATIONS = Number(process.env.AI_DAILY_GENERATIONS ?? 60);
const DAILY_CHAT_MESSAGES = Number(process.env.AI_DAILY_CHAT_MESSAGES ?? 150);

export class AiQuotaError extends Error {
  readonly status = 429;
}

export async function assertDailyAiQuota(userId: string, kind: "generation" | "chat") {
  const prisma = getPrisma();
  const since = startOfToday();
  if (kind === "chat") {
    const messages = await prisma.chatMessage.count({ where: { userId, role: "user", createdAt: { gte: since } } });
    if (messages >= DAILY_CHAT_MESSAGES) throw new AiQuotaError("Você chegou ao limite de mensagens do chat por hoje. Volte amanhã!");
    return;
  }
  const [quizzes, decks, essays, plans] = await Promise.all([
    prisma.quiz.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.flashcardDeck.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.essay.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.studyPlan.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  if (quizzes + decks + essays + plans >= DAILY_GENERATIONS) {
    throw new AiQuotaError("Você chegou ao limite de gerações com IA por hoje. Volte amanhã!");
  }
}
