import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { StudyStartError, startStudyBlockForUser } from "@/lib/study-start";

// Gerar quiz/simulado/flashcards com a IA pode levar alguns segundos.
export const maxDuration = 120;

const schema = z.object({
  subject: z.string().min(1).max(120),
  topic: z.string().max(300).default(""),
  method: z.string().max(120).default(""),
  type: z.enum(["estudo", "revisao", "simulado", "redacao"]).catch("estudo"),
});

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user.id, "generation");

    const block = schema.parse(await request.json());
    const result = await startStudyBlockForUser(user.id, block);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudyStartError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, {
      scope: "study-plan.start",
      fallback: "Não foi possível preparar a atividade deste bloco.",
    });
  }
}
