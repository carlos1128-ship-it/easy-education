import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ETEC_EXAM, ETEC_SIMULADO_TITLE as ETEC_TITLE, isEtecStudent } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { startOfDaySP } from "@/lib/time-window";
import { withFeature } from "@/lib/usage";

export const maxDuration = 120;

/**
 * Simulado no formato do Vestibulinho da ETEC: 50 questões de 5 alternativas, Fundamental II, interdisciplinar.
 * Um por dia: se o de hoje já existe, devolve o mesmo (sem gastar o limite). Gerar gasta 50 questões do limite
 * de simulados por IA.
 */
export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

    const prisma = getPrisma();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { personalization: true } });
    if (!isEtecStudent(profile?.personalization)) return NextResponse.json({ error: "Seu objetivo não é o Vestibulinho da ETEC." }, { status: 400 });

    const existing = await prisma.quiz.findFirst({
      where: { userId: user.id, difficulty: "simulado", title: ETEC_TITLE, createdAt: { gte: startOfDaySP() } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ quizId: existing.id, reused: true });

    const quiz = await withFeature(
      user,
      "ai_simulado",
      () =>
        createSimuladoForUser({
          userId: user.id,
          subject: "Multidisciplinar",
          topic: `Simulado do Vestibulinho da ETEC: ${ETEC_EXAM.subjects.join(", ")} do 6º ao 9º ano (BNCC). Distribua as questões entre essas matérias, com questões interdisciplinares, interpretação de texto, gráficos e tabelas e situações do cotidiano.`,
          title: ETEC_TITLE,
          questionCount: ETEC_EXAM.questions,
        }),
      { amount: ETEC_EXAM.questions },
    );
    revalidatePath("/dashboard/simulados");
    return NextResponse.json({ quizId: quiz.id, reused: false });
  } catch (error) {
    return apiErrorResponse(error, { scope: "simulados.etec", fallback: "Não foi possível gerar o simulado." });
  }
}
