import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { withFeature } from "@/lib/usage";
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
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = quizGenerateSchema.parse(await request.json());
    // Limites do plano: simulado e quiz gerados por IA têm contadores próprios (sem assinatura, a rota recusa).
    if (payload.difficulty === "simulado") {
      // Simulado é contado em questões: um de 45 gasta 45 do dia.
      const quiz = await withFeature(
        user,
        "ai_simulado",
        () =>
          createSimuladoForUser({
            userId: user.id,
            subject: payload.subject,
            topic: payload.topic,
            questionCount: payload.questionCount,
            fileId: payload.fileId,
          }),
        { amount: payload.questionCount },
      );
      revalidateQuizPages();
      return NextResponse.json({ quizId: quiz.id });
    }

    const quiz = await withFeature(user, "ai_quiz", () => createQuizForUser({ userId: user.id, ...payload }));
    revalidateQuizPages();
    return NextResponse.json({ quizId: quiz.id });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "quiz.generate",
      fallback: "Não foi possível gerar o quiz.",
    });
  }
}
