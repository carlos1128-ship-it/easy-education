import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { answerQuestion } from "@/lib/bank/service";
import { ensureOfficialQuestionExplanations } from "@/lib/bank/explanations";
import { needsOfficialExplanation } from "@/lib/bank/explanation-quality";
import { getQuestionPeerStats } from "@/lib/bank/peer-stats";
import { getAccessState } from "@/lib/billing";
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
    // O plano decide se a questão ultrassecreta pode ser respondida (só no Completo).
    const access = await getAccessState(user);
    const result = await answerQuestion({ userId: user.id, ...payload, tier: access.tier });
    if (!("correctLabel" in result) || !result.correctLabel) return NextResponse.json(result);
    // Na prática, junto com o gabarito: quantos % dos outros alunos acertaram (só com amostra mínima).
    const peers = await getQuestionPeerStats([payload.questionId], user.id);
    const peerCorrectPct = peers.get(payload.questionId)?.correctPct ?? null;
    if (needsOfficialExplanation(result.explanation, result.correctLabel)) {
      const explanations = await ensureOfficialQuestionExplanations({ questionIds: [payload.questionId], user, feature: "ai_quiz" });
      return NextResponse.json({ ...result, peerCorrectPct, explanation: explanations.get(payload.questionId) ?? null });
    }
    return NextResponse.json({ ...result, peerCorrectPct });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.answer", fallback: "Não foi possível salvar a resposta." });
  }
}
