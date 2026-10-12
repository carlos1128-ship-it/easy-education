import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { REPORT_KINDS } from "@/lib/bank/constants";
import { getPrisma } from "@/lib/prisma";

const schema = z.object({ questionId: z.string().min(1), kind: z.enum(REPORT_KINDS), note: z.string().max(1000).optional() });
const DAY_MS = 24 * 60 * 60 * 1000;

/** "Avisar erro" numa questão de quiz ou simulado: enunciado, gabarito ou explicação errados. Vai para a equipe analisar. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const payload = schema.parse(await request.json());
    const prisma = getPrisma();

    const question = await prisma.quizQuestion.findFirst({ where: { id: payload.questionId, quizId: id, quiz: { userId: user.id } }, select: { id: true } });
    if (!question) return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });

    const recent = await prisma.quizQuestionReport.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
    if (recent >= 20) return NextResponse.json({ error: "Você já enviou muitos avisos hoje. Obrigado, vamos analisar!" }, { status: 429 });

    await prisma.quizQuestionReport.create({ data: { userId: user.id, quizQuestionId: question.id, kind: payload.kind, note: payload.note?.trim().slice(0, 1000) || null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "quiz.report", fallback: "Não foi possível enviar o aviso." });
  }
}
