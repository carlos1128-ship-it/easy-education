import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { finishSession } from "@/lib/bank/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const { result } = await finishSession(user.id, id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/desempenho");
    return NextResponse.json({ ok: true, accuracy: result.accuracy, correct: result.correct, total: result.total });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.finish", fallback: "Não foi possível encerrar a sessão." });
  }
}
