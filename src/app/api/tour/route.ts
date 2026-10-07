import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

/** Marca o tutorial guiado como visto (terminado ou pulado), para não abrir de novo sozinho. */
export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await getPrisma().profile.updateMany({ where: { userId: user.id }, data: { tourCompletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "tour.complete", fallback: "Não foi possível salvar." });
  }
}
