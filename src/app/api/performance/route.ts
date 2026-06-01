import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const prisma = getPrisma();
  const [sessions, quizzes, essays, flashcards] = await Promise.all([
    prisma.studySession.findMany({ where: { userId: user.id } }),
    prisma.quiz.findMany({ where: { userId: user.id, score: { not: null } } }),
    prisma.essay.findMany({ where: { userId: user.id, score: { not: null } }, orderBy: { createdAt: "asc" } }),
    prisma.flashcard.findMany({ where: { deck: { userId: user.id } } }),
  ]);

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const averageQuiz = quizzes.length ? quizzes.reduce((sum, quiz) => sum + (quiz.score ?? 0), 0) / quizzes.length : 0;
  const averageEssay = essays.length ? essays.reduce((sum, essay) => sum + (essay.score ?? 0), 0) / essays.length : 0;

  return NextResponse.json({
    totalHours: Math.round(totalMinutes / 60),
    averageQuiz,
    averageEssay,
    flashcardsDue: flashcards.filter((card) => card.nextReview <= new Date()).length,
    essayScores: essays.map((essay) => ({ date: essay.createdAt, score: essay.score })),
  });
}
