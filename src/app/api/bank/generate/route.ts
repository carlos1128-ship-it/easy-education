import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { DIFFICULTIES } from "@/lib/bank/constants";
import { createAiQuestion } from "@/lib/bank/generate";
import { checkRateLimit } from "@/lib/rate-limit";
import { withFeature } from "@/lib/usage";

// Gerar e verificar uma questão são duas chamadas à IA (às vezes quatro, se a primeira for descartada).
export const maxDuration = 120;

const schema = z.object({
  exam: z.string().max(40).default("enem"),
  subject: z.string().min(1).max(60),
  topic: z.string().max(120).optional(),
  difficulty: z.enum(DIFFICULTIES).default("medio"),
});

/** Questão nova gerada por IA (bloqueada no Gratuito; limite diário nos pagos). Sempre com selo "Gerada por IA". */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`bank-generate:${user.id}`, 6, 60_000).ok) return NextResponse.json({ error: "Muitas questões em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
    const payload = schema.parse(await request.json());
    const question = await withFeature(user, "ai_question", () => createAiQuestion({ userId: user.id, examSlug: payload.exam, subjectSlug: payload.subject, topic: payload.topic, difficulty: payload.difficulty }));
    return NextResponse.json({ questionId: question.id });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.generate", fallback: "Não foi possível gerar a questão." });
  }
}
