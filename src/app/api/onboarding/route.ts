import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { buildLearnerContext, goalLabel } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { createStudyPlanForUser } from "@/lib/study-plan-generation";
import { assertWithinSafetyCaps, consumeFeature, requireTier } from "@/lib/usage";
import { onboardingSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const payload = onboardingSchema.parse(await request.json());
    const prisma = getPrisma();
    const personalization = payload.personalization ?? null;
    // Com a personalização, o objetivo vira um rótulo preciso (ex.: "Inglês · IELTS", "Concurso · Polícia Federal").
    const studyGoal = personalization ? goalLabel(personalization) : payload.goal;
    const data = {
      studyGoal,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
      dailyMinutes: payload.dailyMinutes,
      level: payload.level.toLowerCase(),
      studyMethod: payload.studyMethod,
      onboardingDone: true,
      ...(personalization ? { personalization } : {}),
    };

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        name: (user.user_metadata.name as string | undefined) ?? user.email ?? "Aluno Easy",
        email: user.email ?? "",
        ...data,
      },
    });

    const existingPlan = await prisma.studyPlan.findFirst({
      where: { userId: user.id, status: "active" },
      select: { id: true },
    });

    // O primeiro plano do aluno não gasta o limite de planos; refazer a personalização gasta (é um plano novo).
    const tier = await requireTier(user);
    const regenerate = Boolean(existingPlan && payload.regeneratePlan);
    const ticket = regenerate ? await consumeFeature(user, "study_plan", { tier }) : null;
    if (!existingPlan) await assertWithinSafetyCaps(user, { tier });

    let planResult: Awaited<ReturnType<typeof createStudyPlanForUser>> | null = null;
    try {
      if (!existingPlan || regenerate) {
        planResult = await createStudyPlanForUser(user.id, {
          goal: studyGoal,
          targetDate: payload.targetDate,
          dailyHours: payload.dailyMinutes / 60,
          subjects: payload.subjects,
          method: payload.studyMethod,
          studyDays: personalization?.studyDays,
          period: personalization?.period,
          learnerContext: buildLearnerContext(profile),
        });
      }
    } catch (error) {
      await ticket?.refund();
      throw error;
    }

    // Refez a personalização: o plano antigo é arquivado e o novo (criado acima) passa a valer.
    if (existingPlan && regenerate && planResult) {
      await prisma.studyPlan.updateMany({
        where: { userId: user.id, status: "active", id: { not: planResult.record.id } },
        data: { status: "archived" },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plano");
    revalidatePath("/dashboard/configuracoes");

    return NextResponse.json({ ok: true, planId: planResult?.record.id ?? existingPlan?.id ?? null });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "onboarding",
      fallback: "Nao foi possivel salvar seu onboarding.",
    });
  }
}
