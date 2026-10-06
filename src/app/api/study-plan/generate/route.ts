import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createStudyPlanForUser } from "@/lib/study-plan-generation";

const schema = z.object({
  goal: z.string().max(120),
  targetDate: z.string().max(40).optional(),
  dailyHours: z.number().min(1).max(8),
  subjects: z.array(z.object({ name: z.string().max(80), difficulty: z.number().min(1).max(5) })).max(30),
  method: z.string().max(60),
});

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "generation");
    if (!checkRateLimit(`study-plan:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = schema.parse(await request.json());
    const { record, plan } = await createStudyPlanForUser(user.id, payload);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/plano");

    return NextResponse.json({ planId: record.id, plan });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "study-plan.generate",
      fallback: "Nao foi possivel gerar o plano.",
    });
  }
}
