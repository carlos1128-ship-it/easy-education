import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { generateTextFromImage } from "@/lib/gemini";
import { extractTextFromPDF } from "@/lib/pdf";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { createStorageServerClient } from "@/lib/supabase/storage";
import { extractTextFromBuffer } from "@/lib/text";
import { isVideoFile, processVideoMaterial } from "@/lib/youtube";

/** Vídeo do YouTube pode levar até alguns minutos para ser lido de novo. */
export const maxDuration = 300;

const IMAGE_INSTRUCTION = `Você recebeu a foto de um material de estudo (caderno, apostila, livro, lousa ou exercício).
Transcreva todo o texto legível, na ordem de leitura, em português.
Depois, se houver fórmulas, gráficos, tabelas ou esquemas, descreva o conteúdo deles em texto simples.
Não invente o que não estiver legível; escreva [ilegível] nesses trechos. Responda só com o conteúdo, sem markdown.`;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "generation");

    const { id } = await context.params;
    const prisma = getPrisma();
    const file = await prisma.uploadedFile.findFirst({ where: { id, userId: user.id } });
    if (!file) return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });

    // Vídeo: lê de novo (botão "Tentar de novo" depois de uma falha).
    if (isVideoFile(file)) {
      if (!checkRateLimit(`video:${user.id}`, 5, 60_000).ok) return NextResponse.json({ error: "Muitos vídeos em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
      await processVideoMaterial(file.id);
      const updated = await prisma.uploadedFile.findUnique({ where: { id }, select: { processed: true, processingError: true } });
      revalidatePath("/dashboard/arquivos");
      if (!updated?.processed) return NextResponse.json({ error: updated?.processingError ?? "Não foi possível ler o vídeo." }, { status: 422 });
      return NextResponse.json({ ok: true });
    }

    const supabase = await createStorageServerClient();
    const { data, error } = await supabase.storage.from("arquivos").download(file.storagePath);
    if (error || !data) throw new Error("Falha ao baixar arquivo do storage.");

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let textContent: string;
    if (file.type.startsWith("image/")) {
      // Foto de caderno, apostila ou lousa: a IA transcreve o texto e descreve o que for visual.
      if (!checkRateLimit(`image-read:${user.id}`).ok) return NextResponse.json({ error: "Muitas imagens em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
      textContent = await generateTextFromImage(buffer, file.type, IMAGE_INSTRUCTION);
    } else if (file.type === "application/pdf") {
      textContent = await extractTextFromPDF(buffer);
    } else {
      textContent = extractTextFromBuffer(buffer, file.type);
    }

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

    if (!isVideoFile(file)) {
      const supabase = await createStorageServerClient();
      await supabase.storage.from("arquivos").remove([file.storagePath]);
    }
    // Quizzes gerados do material continuam existindo, só perdem o vínculo.
    await prisma.quiz.updateMany({ where: { fileId: id, userId: user.id }, data: { fileId: null } });
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
