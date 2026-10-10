import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getPanelRun } from "@/lib/study-runs";

/** Bloco do plano em andamento (para o painel do roteiro), com as etapas já marcadas pelos eventos reais. */
export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    return NextResponse.json({ run: await getPanelRun(user.id) });
  } catch (error) {
    return apiErrorResponse(error, { scope: "study-plan.run", fallback: "Não foi possível carregar o bloco em andamento." });
  }
}
