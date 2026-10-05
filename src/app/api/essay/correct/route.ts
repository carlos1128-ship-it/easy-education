import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { essaySchema } from "@/lib/validators";
import type { EssayFeedback } from "@/types";

function normalizeEssayFeedback(feedback: EssayFeedback): EssayFeedback {
  const totalScore = Number(feedback.totalScore);
  if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 1000) {
    throw new Error("A IA retornou uma nota de redacao invalida.");
  }

  if (!feedback.generalFeedback || !feedback.criteria || typeof feedback.criteria !== "object") {
    throw new Error("A IA retornou feedback de redacao incompleto.");
  }

  if (!Array.isArray(feedback.strengths) || feedback.strengths.length < 2) {
    throw new Error("A IA retornou poucos pontos fortes da redacao.");
  }

  if (!Array.isArray(feedback.improvements) || feedback.improvements.length < 2) {
    throw new Error("A IA retornou poucas melhorias da redacao.");
  }

  return {
    ...feedback,
    totalScore,
  };
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user.id, "generation");
    if (!checkRateLimit(`essay:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = essaySchema.parse(await request.json());
    const prompt = `Corrija a redacao abaixo nos criterios do ${payload.model}, em portugues brasileiro.
Tema: ${payload.theme}
Titulo: ${payload.title}
Redacao:
${payload.content}

Regras obrigatorias:
- A nota total deve ir de 0 a 1000.
- De feedback especifico para o texto enviado; nao use mensagens genericas.
- Aponte pelo menos 2 pontos fortes e 2 melhorias acionaveis.
- Se o modelo for ENEM, considere norma culta, compreensao do tema, argumentacao, coesao e proposta de intervencao.
Retorne APENAS JSON valido nesta estrutura: {"totalScore": number, "criteria": {"normasCultas": {"score": number, "feedback": string}, "compreensao": {"score": number, "feedback": string}, "argumentacao": {"score": number, "feedback": string}, "coesao": {"score": number, "feedback": string}, "proposta": {"score": number, "feedback": string}}, "strengths": [string], "improvements": [string], "generalFeedback": string}.`;
    const feedback = normalizeEssayFeedback(await generateJSON<EssayFeedback>(prompt, { thinkingBudget: 2048 }));
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
