import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { describeSubjectForPrompt, fillQuestionCount, sanitizeGeneratedQuizQuestions, subjectsFromText } from "@/lib/quiz-questions";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { quizGenerateSchema } from "@/lib/validators";
import type { GeneratedQuizQuestion } from "@/types";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = quizGenerateSchema.parse(await request.json());
    const prisma = getPrisma();
    if (payload.difficulty === "simulado") {
      const quiz = await createSimuladoForUser({
        userId: user.id,
        subject: payload.subject,
        topic: payload.topic,
        questionCount: payload.questionCount,
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/quizzes");
      revalidatePath("/dashboard/simulados");
      revalidatePath("/dashboard/desempenho");

      return NextResponse.json({ quizId: quiz.id });
    }

    const file = payload.fileId ? await prisma.uploadedFile.findFirst({ where: { id: payload.fileId, userId: user.id } }) : null;
    const topic = payload.topic ?? file?.textContent?.slice(0, 5000);
    const promptScope = describeSubjectForPrompt(payload.subject, topic);
    const prompt = `Gere exatamente ${payload.questionCount} questoes de multipla escolha sobre ${JSON.stringify(promptScope)} no nivel ${payload.difficulty} no estilo ${payload.model}. Se houver mais de uma materia, distribua as questoes entre elas e deixe claro o assunto no enunciado. Para cada questao, retorne um JSON com: question (string), options (array de exatamente 4 strings A-D), correctAnswer (apenas A, B, C ou D), explanation (string explicando por que a resposta esta correta). Responda APENAS com um array JSON valido, sem texto adicional.`;
    const rawQuestions = await generateJSON<GeneratedQuizQuestion[]>(prompt);
    const questions = fillQuestionCount(
      sanitizeGeneratedQuizQuestions(rawQuestions, payload.questionCount, payload.subject),
      payload.questionCount,
      subjectsFromText(payload.subject),
    );

    const quiz = await prisma.quiz.create({
      data: {
        userId: user.id,
        fileId: payload.fileId,
        title: payload.difficulty === "simulado" ? `Simulado de ${payload.subject}` : payload.topic ?? `Quiz de ${payload.subject}`,
        subject: payload.subject,
        difficulty: payload.difficulty,
        questionCount: questions.length,
        questions: {
          create: questions.map((question, order) => ({
            question: question.question,
            options: question.options,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            order,
          })),
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/quizzes");
    revalidatePath("/dashboard/simulados");
    revalidatePath("/dashboard/desempenho");

    return NextResponse.json({ quizId: quiz.id });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "quiz.generate",
      fallback: "Nao foi possivel gerar o quiz.",
    });
  }
}
