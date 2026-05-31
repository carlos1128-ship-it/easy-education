import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { essaySchema } from "@/lib/validators";
import type { EssayFeedback } from "@/types";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`essay:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = essaySchema.parse(await request.json());
    const prompt = `Corrija a seguinte redacao nos criterios do ${payload.model}. Retorne um JSON com: {"totalScore": number, "criteria": {"normasCultas": {"score": number, "feedback": string}, "compreensao": {"score": number, "feedback": string}, "argumentacao": {"score": number, "feedback": string}, "coesao": {"score": number, "feedback": string}, "proposta": {"score": number, "feedback": string}}, "strengths": [string], "improvements": [string], "generalFeedback": string}. Redacao: ${payload.content}. Responda APENAS com JSON valido.`;
    const feedback = await generateJSON<EssayFeedback>(prompt);
    const prisma = getPrisma();
    const essay = await prisma.essay.create({
      data: {
        userId: user.id,
        title: payload.title,
        theme: payload.theme,
        model: payload.model,
        content: payload.content,
        score: feedback.totalScore,
        feedback,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/redacao");
    revalidatePath("/dashboard/desempenho");

    return NextResponse.json({ essayId: essay.id, feedback });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "essay.correct",
      fallback: "Nao foi possivel corrigir a redacao.",
    });
  }
}
