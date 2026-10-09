import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { buildEnemEssayPrompt, enemEssaySchema, normalizeEnemFeedback, type RawEnemFeedback } from "@/lib/enem-essay";
import { getLearnerPromptProfile } from "@/lib/exam-style";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { withFeature } from "@/lib/usage";
import { essaySchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`essay:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = essaySchema.parse(await request.json());
    // Limite de redações do plano (texto e foto contam no mesmo limite).
    const feedback = await withFeature(user, "essay_correction", async () => {
      const learner = await getLearnerPromptProfile(user.id);
      // Grade oficial do INEP: níveis 0–200 por competência, regras de nota zero, tangenciamento e direitos humanos.
      const prompt = buildEnemEssayPrompt({ ...payload, learnerContext: learner.context });
      return normalizeEnemFeedback(
        await generateJSON<RawEnemFeedback>(prompt, { schema: enemEssaySchema, thinkingBudget: 2048, temperature: 0.1, attemptTimeoutMs: 60_000 }),
      );
    });
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
