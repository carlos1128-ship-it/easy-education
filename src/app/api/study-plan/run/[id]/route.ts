import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ensureWeeklySimuladoForUser } from "@/lib/simulado";
import { pauseRun, toRunView } from "@/lib/study-runs";

const schema = z.object({ action: z.enum(["pause", "discard"]) });

/** Pausa o cronômetro do bloco: "pause" registra o tempo; "discard" descarta o trecho em andamento. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const { action } = schema.parse(await request.json());
    const run = await pauseRun(user.id, id, { record: action === "pause" });
    if (!run) return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    if (action === "pause") await ensureWeeklySimuladoForUser(user).catch(() => null);
    for (const path of ["/dashboard", "/dashboard/plano", "/dashboard/trilha", "/dashboard/desempenho"]) revalidatePath(path);
    return NextResponse.json({ run: await toRunView(run) });
  } catch (error) {
    return apiErrorResponse(error, { scope: "study-plan.run.pause", fallback: "Não foi possível pausar o bloco." });
  }
}
