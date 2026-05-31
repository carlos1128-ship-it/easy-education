import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await context.params;
  const body = (await request.json()) as { questionId: string; answer: string };
  const prisma = getPrisma();
  const quiz = await prisma.quiz.findFirst({ where: { id, userId: user.id }, include: { questions: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz nao encontrado." }, { status: 404 });

  const question = quiz.questions.find((item) => item.id === body.questionId);
  if (!question) return NextResponse.json({ error: "Questao nao encontrada." }, { status: 404 });

  await prisma.quizQuestion.update({
    where: { id: body.questionId },
    data: { userAnswer: body.answer, isCorrect: body.answer === question.correctAnswer },
  });

  const updatedQuestions = await prisma.quizQuestion.findMany({ where: { quizId: id } });
  const answered = updatedQuestions.filter((item) => item.userAnswer !== null);
  if (answered.length === updatedQuestions.length) {
    const correct = answered.filter((item) => item.isCorrect).length;
    const completedAt = new Date();
    const score = (correct / answered.length) * 100;
    const durationMinutes = Math.max(1, Math.min(180, Math.ceil((completedAt.getTime() - quiz.createdAt.getTime()) / 60000)));

    await prisma.$transaction([
      prisma.quiz.update({ where: { id }, data: { score, completedAt } }),
      ...(quiz.completedAt
        ? []
        : [
            prisma.studySession.create({
              data: {
                userId: user.id,
                subject: quiz.subject,
                durationMinutes,
                method: quiz.title.toLowerCase().includes("simulado") ? "simulado" : "quiz",
                notes: `Atividade de ${quiz.title} (${quiz.id}). Resultado: ${Math.round(score)}%`,
              },
            }),
          ]),
    ]);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quizzes");
  revalidatePath("/dashboard/simulados");
  revalidatePath("/dashboard/desempenho");

  return NextResponse.json({ correct: body.answer === question.correctAnswer, explanation: question.explanation });
}
