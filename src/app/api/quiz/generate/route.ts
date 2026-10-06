import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { quizGenerateSchema } from "@/lib/validators";

function revalidateQuizPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quizzes");
  revalidatePath("/dashboard/simulados");
  revalidatePath("/dashboard/desempenho");
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "generation");
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = quizGenerateSchema.parse(await request.json());
    if (payload.difficulty === "simulado") {
      const quiz = await createSimuladoForUser({
        userId: user.id,
        subject: payload.subject,
        topic: payload.topic,
        questionCount: payload.questionCount,
      });
      revalidateQuizPages();
      return NextResponse.json({ quizId: quiz.id });
    }

    const quiz = await createQuizForUser({ userId: user.id, ...payload });
    revalidateQuizPages();
    return NextResponse.json({ quizId: quiz.id });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "quiz.generate",
      fallback: "Não foi possível gerar o quiz.",
    });
  }
}
