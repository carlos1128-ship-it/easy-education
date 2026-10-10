import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { noteUpdateSchema } from "@/lib/notes";
import { getPrisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const { content } = noteUpdateSchema.parse(await request.json());
    const updated = await getPrisma().note.updateMany({ where: { id, userId: user.id }, data: { content } });
    if (!updated.count) return NextResponse.json({ error: "Anotação não encontrada." }, { status: 404 });
    revalidatePath("/dashboard/anotacoes");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "notes.update", fallback: "Não foi possível salvar a anotação." });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    await getPrisma().note.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/anotacoes");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "notes.delete", fallback: "Não foi possível apagar a anotação." });
  }
}
