import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createStorageServerClient } from "@/lib/supabase/storage";

const allowedTypes = ["application/pdf", "text/plain"];

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Arquivo acima de 20MB." }, { status: 400 });
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Tipo de arquivo nao permitido." }, { status: 400 });

    const supabase = await createStorageServerClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("arquivos").upload(storagePath, file, { upsert: false });
    if (error) throw new Error("Falha ao enviar arquivo ao storage.");

    const prisma = getPrisma();
    const record = await prisma.uploadedFile.create({
      data: { userId: user.id, name: file.name, type: file.type, sizeBytes: file.size, storagePath },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/arquivos");

    return NextResponse.json({ file: record });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "files.upload",
      fallback: "Nao foi possivel enviar o arquivo.",
    });
  }
}
