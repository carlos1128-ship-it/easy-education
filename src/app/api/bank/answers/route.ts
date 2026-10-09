import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { answerQuestion } from "@/lib/bank/service";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  questionId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  selected: z.string().min(1).max(2),
  timeMs: z.number().min(0).max(24 * 60 * 60 * 1000).default(0),
});

/** Registra a resposta. Em prática devolve gabarito e resolução; em simulado/diagnóstico só confirma. */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`bank-answer:${user.id}`, 120, 60_000).ok) return NextResponse.json({ error: "Muitas respostas em pouco tempo." }, { status: 429 });
    const payload = schema.parse(await request.json());
    return NextResponse.json(await answerQuestion({ userId: user.id, ...payload }));
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.answer", fallback: "Não foi possível salvar a resposta." });
  }
}
