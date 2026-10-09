import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { createFlashcardDeckForUser } from "@/lib/flashcard-generation";
import { getPrisma } from "@/lib/prisma";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { startOfToday } from "@/lib/study-stats";
import { startBankPractice } from "@/lib/bank/fallback";
import { PlanLimitError, withFeature } from "@/lib/usage";

export type StudyBlockInput = {
  subject: string;
  topic: string;
  method: string;
  type: "estudo" | "revisao" | "simulado" | "redacao";
};

export type StudyStart = { href: string; activity: "redacao" | "simulado" | "flashcards" | "quiz" | "banco"; reused: boolean };

/** Recurso de IA fora do plano (Gratuito)? Então o bloco abre a versão do banco de questões. */
function isLocked(error: unknown) {
  return error instanceof PlanLimitError && error.info.code === "feature_locked";
}

export class StudyStartError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function isEssay(block: StudyBlockInput) {
  const text = `${block.subject} ${block.topic}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return block.type === "redacao" || text.includes("redacao");
}

function revalidateStudyPages() {
  for (const path of ["/dashboard", "/dashboard/quizzes", "/dashboard/simulados", "/dashboard/flashcards"]) revalidatePath(path);
}

/**
 * Prepara a atividade de um bloco do plano: redação abre a tela de redação;
 * simulado, revisão e estudo geram simulado, flashcards ou quiz com a IA.
 * Se o aluno já começou o mesmo bloco hoje, reaproveita o que foi gerado.
 */
export async function startStudyBlockForUser(user: Pick<User, "id" | "email">, block: StudyBlockInput): Promise<StudyStart> {
  if (isEssay(block)) return { href: "/dashboard/redacao", activity: "redacao", reused: true };

  const userId = user.id;
  const prisma = getPrisma();
  const today = startOfToday();
  const topic = block.topic.trim().slice(0, 160) || block.subject;

  if (block.type === "simulado") {
    const title = `Simulado de ${block.subject}`;
    const existing = await prisma.quiz.findFirst({
      where: { userId, difficulty: "simulado", title, createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return { href: `/dashboard/simulados/${existing.id}`, activity: "simulado", reused: true };
    if (!checkRateLimit(`quiz:${userId}`).ok) throw new StudyStartError("Muitas gerações em pouco tempo. Tente de novo em um minuto.", 429);
    // Gerar com IA gasta o limite do plano (só quando realmente gera; reaproveitar o de hoje é grátis).
    try {
      const quiz = await withFeature(user, "ai_simulado", () => createSimuladoForUser({ userId, subject: block.subject, topic, title, questionCount: 10 }));
      revalidateStudyPages();
      return { href: `/dashboard/simulados/${quiz.id}`, activity: "simulado", reused: false };
    } catch (error) {
      if (isLocked(error)) return { href: "/dashboard/banco/simulados", activity: "banco", reused: false };
      throw error;
    }
  }

  if (block.type === "revisao") {
    const title = `Revisão: ${topic}`.slice(0, 120);
    const existing = await prisma.flashcardDeck.findFirst({
      where: { userId, title, createdAt: { gte: today } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return { href: `/dashboard/flashcards/${existing.id}`, activity: "flashcards", reused: true };
    if (!checkRateLimit(`flashcards:${userId}`).ok) throw new StudyStartError("Muitas gerações em pouco tempo. Tente de novo em um minuto.", 429);
    try {
      const deck = await withFeature(user, "ai_flashcards", () => createFlashcardDeckForUser({ userId, title, subject: block.subject, topic, count: 10 }));
      revalidateStudyPages();
      return { href: `/dashboard/flashcards/${deck.id}`, activity: "flashcards", reused: false };
    } catch (error) {
      if (isLocked(error)) return { href: "/dashboard/revisao", activity: "banco", reused: false };
      throw error;
    }
  }

  const existing = await prisma.quiz.findFirst({
    where: { userId, title: topic, subject: block.subject, difficulty: { not: "simulado" }, createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return { href: `/dashboard/quizzes/${existing.id}`, activity: "quiz", reused: true };
  if (!checkRateLimit(`quiz:${userId}`).ok) throw new StudyStartError("Muitas gerações em pouco tempo. Tente de novo em um minuto.", 429);
  try {
    const quiz = await withFeature(user, "ai_quiz", () => createQuizForUser({ userId, subject: block.subject, topic, difficulty: "medio", questionCount: 10 }));
    revalidateStudyPages();
    return { href: `/dashboard/quizzes/${quiz.id}`, activity: "quiz", reused: false };
  } catch (error) {
    if (!isLocked(error)) throw error;
    const practice = await startBankPractice(userId, { subject: block.subject, topic: block.topic, count: 10 });
    return { href: practice ? `/dashboard/banco/sessao/${practice.sessionId}` : "/dashboard/banco", activity: "banco", reused: false };
  }
}
