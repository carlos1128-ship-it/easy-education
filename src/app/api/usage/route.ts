import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getUsageSnapshot } from "@/lib/usage";

export const dynamic = "force-dynamic";

/** Uso do aluno em cada recurso do plano (alimenta os avisos "restam X" e os cadeados). */
export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    return NextResponse.json(await getUsageSnapshot(user));
  } catch (error) {
    return apiErrorResponse(error, { scope: "usage", fallback: "Não foi possível carregar o uso do plano." });
  }
}
