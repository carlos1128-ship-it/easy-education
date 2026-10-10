import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { createStorageServerClient } from "@/lib/supabase/storage";
import { assertUploadSize, consumeFeature, requireTier } from "@/lib/usage";

const imageTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedTypes = ["application/pdf", "text/plain", ...imageTypes];

const declaredSchema = z.object({ name: z.string().min(1).max(200), type: z.string().max(100), size: z.number().int().min(1) });

/**
 * Envio de arquivo. Dois jeitos:
 * - JSON { name, type, size } (usado pelo app): confere plano e limites, cria o registro e devolve uma URL
 *   assinada para o navegador enviar o arquivo DIRETO ao Storage. Assim o tamanho do arquivo não passa pela
 *   função (que na Vercel aceita no máximo ~4,5 MB) e os limites de 15 e 50 MB dos planos funcionam.
 * - multipart (arquivos pequenos): o arquivo passa pelo servidor, como antes.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const direct = (request.headers.get("content-type") ?? "").includes("application/json");
    let name: string;
    let type: string;
    let size: number;
    let file: File | null = null;

    if (direct) {
      ({ name, type, size } = declaredSchema.parse(await request.json()));
    } else {
      const formData = await request.formData();
      const sent = formData.get("file");
      if (!(sent instanceof File)) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
      file = sent;
      ({ name, type, size } = sent);
    }
    if (!allowedTypes.includes(type)) return NextResponse.json({ error: "Envie PDF, TXT ou imagem (PNG, JPG ou WebP)." }, { status: 400 });
    if (imageTypes.includes(type) && size > 10 * 1024 * 1024) return NextResponse.json({ error: "Imagem acima de 10MB." }, { status: 400 });

    // Tamanho máximo e quantidade por dia dependem do plano (src/lib/plans.ts). O tamanho é checado antes de gastar o envio do dia.
    const tier = await requireTier(user);
    assertUploadSize(tier, size);
    const ticket = await consumeFeature(user, "file_upload", { tier });

    try {
      const supabase = await createStorageServerClient();
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${user.id}/${Date.now()}-${safeName}`;
      let upload: { path: string; token: string } | undefined;

      if (file) {
        const { error } = await supabase.storage.from("arquivos").upload(storagePath, file, { upsert: false });
        if (error) throw new Error("Falha ao enviar arquivo ao storage.");
      } else {
        const { data, error } = await supabase.storage.from("arquivos").createSignedUploadUrl(storagePath);
        if (error || !data) throw new Error("Falha ao preparar o envio do arquivo.");
        upload = { path: data.path, token: data.token };
      }

      const record = await getPrisma().uploadedFile.create({
        data: { userId: user.id, name, type, sizeBytes: size, storagePath },
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/arquivos");

      return NextResponse.json({ file: record, upload, usage: { remaining: ticket.remaining, max: ticket.max, resetAt: ticket.resetAt } });
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
