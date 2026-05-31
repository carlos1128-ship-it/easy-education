import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { extractTextFromPDF } from "@/lib/pdf";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await context.params;
  const prisma = getPrisma();
  const file = await prisma.uploadedFile.findFirst({ where: { id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("arquivos").download(file.storagePath);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Falha ao baixar arquivo." }, { status: 500 });

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const textContent = file.type === "application/pdf" ? await extractTextFromPDF(buffer) : buffer.toString("utf8");

  await prisma.uploadedFile.update({
    where: { id },
    data: { processed: true, textContent },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/arquivos");

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await context.params;
  const prisma = getPrisma();
  const file = await prisma.uploadedFile.findFirst({ where: { id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });

  const supabase = await createClient();
  await supabase.storage.from("arquivos").remove([file.storagePath]);
  await prisma.uploadedFile.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/arquivos");

  return NextResponse.json({ ok: true });
}
