import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { StudyStartError } from "@/lib/study-start";
import { startBlockRun } from "@/lib/study-runs";

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

    const block = schema.parse(await request.json());
    // Um bloco por dia: concluído responde 409; em andamento reabre a mesma atividade.
    const result = await startBlockRun(user, block);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StudyStartError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, {
      scope: "study-plan.start",
      fallback: "Não foi possível preparar a atividade deste bloco.",
    });
  }
}
