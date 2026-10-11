import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createQuizFromBank, NoBankQuestionsError } from "@/lib/bank/quiz-fallback";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { PlanLimitError, requireTier, withFeature } from "@/lib/usage";
import { quizGenerateSchema } from "@/lib/validators";

function revalidateQuizPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quizzes");
  revalidatePath("/dashboard/simulados");
  revalidatePath("/dashboard/desempenho");
}

/**
 * Quando a IA não pode atender, o quiz sai das provas anteriores (sem IA, sem custo, sem gastar limite):
 * limite do plano ou teto de custo esgotado, ou a IA falhou. Sem plano/assinatura, nada muda (o erro segue).
 */
function bankCanCover(error: unknown) {
  if (error instanceof PlanLimitError) return ["limit_reached", "daily_cap", "monthly_cap"].includes(error.info.code);
  return !(error instanceof Error && error.name === "ZodError");
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = quizGenerateSchema.parse(await request.json());
    const simulado = payload.difficulty === "simulado";
    const fromBank = () =>
      createQuizFromBank({
        userId: user.id,
        subject: payload.subject,
        topic: payload.topic,
        count: payload.questionCount,
        difficulty: payload.difficulty,
        title: simulado ? `Simulado de ${payload.subject}` : undefined,
      });

    // Questões prontas (padrão do formulário): precisa de plano, mas não gasta o limite de IA. Matéria sem
    // questões no banco (ex.: Direito) segue para a IA.
    if (payload.source === "provas" && !payload.fileId) {
      await requireTier(user);
      try {
        const quiz = await fromBank();
        revalidateQuizPages();
        return NextResponse.json({ quizId: quiz.id });
      } catch (error) {
        if (!(error instanceof NoBankQuestionsError)) throw error;
      }
    }

    try {
      // Limites do plano: simulado e quiz gerados por IA têm contadores próprios (sem assinatura, a rota recusa).
      // Simulado é contado em questões: um de 45 gasta 45 do dia.
      const quiz = simulado
        ? await withFeature(
            user,
            "ai_simulado",
            () => createSimuladoForUser({ userId: user.id, subject: payload.subject, topic: payload.topic, questionCount: payload.questionCount, fileId: payload.fileId }),
            { amount: payload.questionCount },
          )
        : await withFeature(user, "ai_quiz", () => createQuizForUser({ userId: user.id, ...payload }));
      revalidateQuizPages();
      return NextResponse.json({ quizId: quiz.id });
    } catch (error) {
      // Material do próprio aluno (arquivo/vídeo) não tem equivalente no banco.
      if (payload.fileId || !bankCanCover(error)) throw error;
      try {
        const quiz = await fromBank();
        revalidateQuizPages();
        return NextResponse.json({ quizId: quiz.id });
      } catch (fallbackError) {
        if (fallbackError instanceof NoBankQuestionsError) throw error;
        throw fallbackError;
      }
    }
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "quiz.generate",
      fallback: "Não foi possível gerar o quiz.",
    });
  }
}
