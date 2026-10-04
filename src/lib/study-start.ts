import { revalidatePath } from "next/cache";
import { createFlashcardDeckForUser } from "@/lib/flashcard-generation";
import { getPrisma } from "@/lib/prisma";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { startOfToday } from "@/lib/study-stats";

export type StudyBlockInput = {
  subject: string;
  topic: string;
  method: string;
  type: "estudo" | "revisao" | "simulado" | "redacao";
};

export type StudyStart = { href: string; activity: "redacao" | "simulado" | "flashcards" | "quiz"; reused: boolean };

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
export async function startStudyBlockForUser(userId: string, block: StudyBlockInput): Promise<StudyStart> {
  if (isEssay(block)) return { href: "/dashboard/redacao", activity: "redacao", reused: true };

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
    const quiz = await createSimuladoForUser({ userId, subject: block.subject, topic, title, questionCount: 10 });
    revalidateStudyPages();
    return { href: `/dashboard/simulados/${quiz.id}`, activity: "simulado", reused: false };
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
    const deck = await createFlashcardDeckForUser({ userId, title, subject: block.subject, topic, count: 10 });
    revalidateStudyPages();
    return { href: `/dashboard/flashcards/${deck.id}`, activity: "flashcards", reused: false };
  }

  const existing = await prisma.quiz.findFirst({
    where: { userId, title: topic, subject: block.subject, difficulty: { not: "simulado" }, createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return { href: `/dashboard/quizzes/${existing.id}`, activity: "quiz", reused: true };
  if (!checkRateLimit(`quiz:${userId}`).ok) throw new StudyStartError("Muitas gerações em pouco tempo. Tente de novo em um minuto.", 429);
  const quiz = await createQuizForUser({ userId, subject: block.subject, topic, difficulty: "medio", questionCount: 10 });
  revalidateStudyPages();
  return { href: `/dashboard/quizzes/${quiz.id}`, activity: "quiz", reused: false };
}
