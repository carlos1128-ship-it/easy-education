import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Arquivo acima de 20MB." }, { status: 400 });
  if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Tipo de arquivo nao permitido." }, { status: 400 });

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("arquivos").upload(storagePath, file, { upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prisma = getPrisma();
  const record = await prisma.uploadedFile.create({
    data: { userId: user.id, name: file.name, type: file.type, sizeBytes: file.size, storagePath },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/arquivos");

  return NextResponse.json({ file: record });
}
