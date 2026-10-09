import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { gradeReview } from "@/lib/bank/service";
import { REVIEW_GRADES } from "@/lib/bank/spaced";

const schema = z.object({ grade: z.enum(REVIEW_GRADES as unknown as [string, ...string[]]) });

/** Nota da revisão (errei, difícil, bom, fácil): calcula quando a questão volta. Vale em todos os planos. */
export async function POST(request: Request, context: { params: Promise<{ questionId: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { questionId } = await context.params;
    const { grade } = schema.parse(await request.json());
    const next = await gradeReview(user.id, questionId, grade as (typeof REVIEW_GRADES)[number]);
    revalidatePath("/dashboard/revisao");
    return NextResponse.json({ ok: true, intervalDays: next.intervalDays, nextReview: next.nextReview });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.review", fallback: "Não foi possível salvar a revisão." });
  }
}
