import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { buildLearnerContext, goalLabel } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { createStudyPlanForUser } from "@/lib/study-plan-generation";
import { onboardingSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "generation");

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

    // Refez a personalização: o plano antigo é arquivado e um novo é montado com as respostas novas.
    if (existingPlan && payload.regeneratePlan) {
      await prisma.studyPlan.updateMany({ where: { userId: user.id, status: "active" }, data: { status: "archived" } });
    }

    const planResult =
      existingPlan && !payload.regeneratePlan
        ? null
        : await createStudyPlanForUser(user.id, {
            goal: studyGoal,
            targetDate: payload.targetDate,
            dailyHours: payload.dailyMinutes / 60,
            subjects: payload.subjects,
            method: payload.studyMethod,
            studyDays: personalization?.studyDays,
            period: personalization?.period,
            learnerContext: buildLearnerContext(profile),
          });

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
