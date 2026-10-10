import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ensureWeeklySimuladoForUser } from "@/lib/simulado";
import { StudyStartError } from "@/lib/study-start";
import { pauseRun, toRunView, toggleRunStep } from "@/lib/study-runs";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("discard") }),
  z.object({ action: z.literal("toggle_step"), step: z.number().int().min(0).max(20) }),
]);

/**
 * Ações no bloco em andamento: "pause" registra o tempo; "discard" descarta o trecho em andamento;
 * "toggle_step" marca ou desmarca uma etapa do roteiro feita pelo próprio aluno.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const payload = schema.parse(await request.json());
    const { action } = payload;
    if (payload.action === "toggle_step") {
      const updated = await toggleRunStep(user.id, id, payload.step);
      if (!updated) return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
      return NextResponse.json({ run: await toRunView(updated) });
    }
    const run = await pauseRun(user.id, id, { record: action === "pause" });
    if (!run) return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    if (action === "pause") await ensureWeeklySimuladoForUser(user).catch(() => null);
    for (const path of ["/dashboard", "/dashboard/plano", "/dashboard/trilha", "/dashboard/desempenho"]) revalidatePath(path);
    return NextResponse.json({ run: await toRunView(run) });
  } catch (error) {
    if (error instanceof StudyStartError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, { scope: "study-plan.run.pause", fallback: "Não foi possível pausar o bloco." });
  }
}
