import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { describeSubjectForPrompt, fillQuestionCount, sanitizeGeneratedQuizQuestions } from "@/lib/quiz-questions";
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
    const prompt = `Gere exatamente ${payload.questionCount} questoes ineditas de multipla escolha sobre ${JSON.stringify(promptScope)} no nivel ${payload.difficulty} no estilo ${payload.model}.
Regras obrigatorias:
- Cada enunciado deve conter uma situacao, dado, texto curto, fenomeno ou contexto real; nao use "resolva a situacao-problema proposta" sem apresentar a situacao.
- As alternativas devem ser conteudos concretos, nunca "Alternativa correta", "Distrator plausivel", "Distrator comum" ou placeholders.
- Se houver mais de uma materia, distribua as questoes entre elas e cite a materia no enunciado de forma natural.
- A explicacao deve justificar a alternativa correta e mencionar por que ao menos um distrator esta errado.
Retorne APENAS um array JSON valido com exatamente estes campos: question (string), options (array de exatamente 4 strings A-D), correctAnswer (apenas A, B, C ou D), explanation (string).`;
    const rawQuestions = await generateJSON<GeneratedQuizQuestion[]>(prompt);
    const questions = fillQuestionCount(
      sanitizeGeneratedQuizQuestions(rawQuestions, payload.questionCount, payload.subject),
      payload.questionCount,
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
