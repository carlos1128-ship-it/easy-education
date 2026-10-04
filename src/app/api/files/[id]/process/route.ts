import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { extractTextFromPDF } from "@/lib/pdf";
import { getPrisma } from "@/lib/prisma";
import { createStorageServerClient } from "@/lib/supabase/storage";
import { extractTextFromBuffer } from "@/lib/text";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const { id } = await context.params;
    const prisma = getPrisma();
    const file = await prisma.uploadedFile.findFirst({ where: { id, userId: user.id } });
    if (!file) return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });

    const supabase = await createStorageServerClient();
    const { data, error } = await supabase.storage.from("arquivos").download(file.storagePath);
    if (error || !data) throw new Error("Falha ao baixar arquivo do storage.");

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const textContent = file.type === "application/pdf"
      ? await extractTextFromPDF(buffer)
      : extractTextFromBuffer(buffer, file.type);

    await prisma.uploadedFile.update({
      where: { id },
      data: { processed: true, textContent },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/arquivos");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "files.process",
      fallback: "Nao foi possivel processar o arquivo.",
    });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const { id } = await context.params;
    const prisma = getPrisma();
    const file = await prisma.uploadedFile.findFirst({ where: { id, userId: user.id } });
    if (!file) return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });

    const supabase = await createStorageServerClient();
    await supabase.storage.from("arquivos").remove([file.storagePath]);
    await prisma.uploadedFile.delete({ where: { id } });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/arquivos");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "files.delete",
      fallback: "Nao foi possivel excluir o arquivo.",
    });
  }
}
