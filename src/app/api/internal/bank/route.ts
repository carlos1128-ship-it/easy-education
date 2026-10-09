import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { apiErrorResponse } from "@/lib/api-error";
import { REVIEW_STATUS } from "@/lib/bank/constants";
import { getPrisma } from "@/lib/prisma";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("report"), id: z.string().uuid(), status: z.enum(["aberto", "resolvido", "descartado"]) }),
  z.object({
    type: z.literal("question"),
    id: z.string().uuid(),
    reviewStatus: z.enum(REVIEW_STATUS).optional(),
    /** Liberar ou tirar do ar. Publicar uma questão "divergente" só depois de um professor conferir. */
    isPublished: z.boolean().optional(),
  }),
]);

/** Ações da tela interna: fechar report, marcar revisão de professor, publicar ou despublicar. */
export async function POST(request: Request) {
  try {
    const { response } = await requireAdminApi();
    if (response) return response;
    const payload = schema.parse(await request.json());
    const prisma = getPrisma();

    if (payload.type === "report") {
      await prisma.questionReport.update({ where: { id: payload.id }, data: { status: payload.status } });
    } else {
      const question = await prisma.bankQuestion.findUnique({ where: { id: payload.id }, select: { explanation: true, explanationStatus: true } });
      if (!question) return NextResponse.json({ error: "Questão não encontrada." }, { status: 404 });
      const publishing = payload.isPublished === true && question.explanationStatus === "divergente";
      await prisma.bankQuestion.update({
        where: { id: payload.id },
        data: {
          ...(payload.reviewStatus ? { reviewStatus: payload.reviewStatus } : {}),
          ...(payload.isPublished !== undefined ? { isPublished: payload.isPublished } : {}),
          // Professor conferiu: a resolução passa a valer e o aviso de divergência sai do texto.
          ...(publishing ? { explanationStatus: "validada", reviewStatus: "revisada", explanation: question.explanation?.replace(/\n*\[REVISAR\][^\n]*$/m, "").trim() } : {}),
        },
      });
    }
    revalidatePath("/dashboard/interno/questoes");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "internal.bank", fallback: "Não foi possível salvar." });
  }
}
