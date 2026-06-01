import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createStudyPlanForUser } from "@/lib/study-plan-generation";
import { onboardingSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const payload = onboardingSchema.parse(await request.json());
  const prisma = getPrisma();

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      studyGoal: payload.goal,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
      dailyMinutes: payload.dailyMinutes,
      level: payload.level.toLowerCase(),
      studyMethod: payload.studyMethod,
      onboardingDone: true,
    },
    create: {
      userId: user.id,
      name: user.user_metadata.name as string | undefined ?? user.email ?? "Aluno Easy",
      email: user.email ?? "",
      studyGoal: payload.goal,
      targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
      dailyMinutes: payload.dailyMinutes,
      level: payload.level.toLowerCase(),
      studyMethod: payload.studyMethod,
      onboardingDone: true,
    },
  });

  const existingPlan = await prisma.studyPlan.findFirst({
    where: { userId: user.id, status: "active" },
    select: { id: true },
  });

  const planResult = existingPlan
    ? null
    : await createStudyPlanForUser(user.id, {
        goal: payload.goal,
        targetDate: payload.targetDate,
        dailyHours: payload.dailyMinutes / 60,
        subjects: payload.subjects,
        method: payload.studyMethod,
      });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plano");

  return NextResponse.json({ ok: true, planId: planResult?.record.id ?? existingPlan?.id ?? null });
}
