import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import type { GeneratedStudyPlan } from "@/types";

const schema = z.object({
  goal: z.string(),
  targetDate: z.string().optional(),
  dailyHours: z.number().min(1).max(8),
  subjects: z.array(z.object({ name: z.string(), difficulty: z.number() })),
  method: z.string(),
});

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`study-plan:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = schema.parse(await request.json());
    const prompt = `Monte um plano de estudo semanal compacto para um estudante com o seguinte perfil: Objetivo: ${payload.goal}. Data da prova: ${payload.targetDate ?? "nao informada"}. Horas por dia: ${payload.dailyHours}. Materias e dificuldades: ${JSON.stringify(payload.subjects)}. Metodo: ${payload.method}. Retorne exatamente 7 dias, com no maximo 2 blocos por dia, textos curtos e esta estrutura {"days":[{"dayOfWeek":"monday","blocks":[{"subject":string,"topic":string,"durationMinutes":number,"method":string,"type":"estudo|revisao|simulado|redacao"}]}],"weeklyGoals":[string],"tips":[string]}. Use dayOfWeek em ingles: sunday, monday, tuesday, wednesday, thursday, friday, saturday. Responda APENAS com JSON valido.`;
    const plan = await generateJSON<GeneratedStudyPlan>(prompt);
    const prisma = getPrisma();
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + 7);

    const record = await prisma.studyPlan.create({
      data: {
        userId: user.id,
        title: `Plano semanal - ${payload.goal}`,
        goal: payload.goal,
        startDate: now,
        endDate: end,
        dailyMinutes: payload.dailyHours * 60,
        planData: plan,
        subjects: {
          create: payload.subjects.map((subject) => ({
            name: subject.name,
            difficulty: subject.difficulty,
            weeklyHours: Math.max(1, Math.round(payload.dailyHours)),
          })),
        },
      },
    });

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
