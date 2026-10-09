import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getAccessState } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { createStorageServerClient } from "@/lib/supabase/storage";
import { assertUploadSize, consumeFeature } from "@/lib/usage";

const imageTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedTypes = ["application/pdf", "text/plain", ...imageTypes];

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: "Envie PDF, TXT ou imagem (PNG, JPG ou WebP)." }, { status: 400 });
    if (imageTypes.includes(file.type) && file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Imagem acima de 10MB." }, { status: 400 });

    // Tamanho máximo e quantidade por dia dependem do plano (src/lib/plans.ts). O tamanho é checado antes de gastar o envio do dia.
    const { tier } = await getAccessState(user);
    assertUploadSize(tier, file.size);
    const ticket = await consumeFeature(user, "file_upload", { tier });

    try {
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

    return NextResponse.json({ file: record, usage: { remaining: ticket.remaining, max: ticket.max, resetAt: ticket.resetAt } });
    } catch (error) {
      await ticket.refund();
      throw error;
    }
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "files.upload",
      fallback: "Não foi possível enviar o arquivo.",
    });
  }
}
