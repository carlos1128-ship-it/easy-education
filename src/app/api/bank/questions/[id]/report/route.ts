import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { REPORT_KINDS } from "@/lib/bank/constants";
import { reportQuestion } from "@/lib/bank/service";

const schema = z.object({ kind: z.enum(REPORT_KINDS), note: z.string().max(1000).optional() });

/** "Reportar questão": enunciado errado, gabarito errado, imagem quebrada ou outro. Vai para a equipe analisar. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const payload = schema.parse(await request.json());
    return NextResponse.json(await reportQuestion({ userId: user.id, questionId: id, ...payload }));
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.report", fallback: "Não foi possível enviar o aviso." });
  }
}
