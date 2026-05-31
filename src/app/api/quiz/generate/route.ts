import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { quizGenerateSchema } from "@/lib/validators";
import type { GeneratedQuizQuestion } from "@/types";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

  const payload = quizGenerateSchema.parse(await request.json());
  const prisma = getPrisma();
  const file = payload.fileId ? await prisma.uploadedFile.findFirst({ where: { id: payload.fileId, userId: user.id } }) : null;
  const topic = payload.topic ?? file?.textContent?.slice(0, 5000) ?? payload.subject;
  const prompt = `Gere exatamente ${payload.questionCount} questoes de multipla escolha sobre "${topic}" no nivel ${payload.difficulty} no estilo ${payload.model}. Para cada questao, retorne um JSON com: question (string), options (array de 4 strings A-D), correctAnswer (letra), explanation (string explicando por que a resposta esta correta). Responda APENAS com um array JSON valido, sem texto adicional.`;
  const questions = await generateJSON<GeneratedQuizQuestion[]>(prompt);

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
}
