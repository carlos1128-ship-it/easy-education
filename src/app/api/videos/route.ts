import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { runWithAiCallContext } from "@/lib/ai-cost";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeFeature } from "@/lib/usage";
import {
  fetchVideoMeta,
  formatTimestamp,
  parseTimestamp,
  parseYouTubeUrl,
  processVideoMaterial,
  VIDEO_MAX_MINUTES,
  VideoError,
  videoSourceKey,
  YOUTUBE_FILE_TYPE,
} from "@/lib/youtube";

/** A leitura do vídeo continua depois da resposta (até ~4,5 min); a tela atualiza sozinha ao terminar. */
export const maxDuration = 300;

const videoSchema = z.object({
  url: z.string().trim().min(5).max(500),
  start: z.string().trim().max(12).optional(),
  end: z.string().trim().max(12).optional(),
});

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`video:${user.id}`, 5, 60_000).ok) {
      return NextResponse.json({ error: "Muitos vídeos em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
    }

    const payload = videoSchema.parse(await request.json());
    const parsed = parseYouTubeUrl(payload.url);
    if (!parsed) throw new VideoError("Link inválido. Cole o endereço de um vídeo do YouTube (youtube.com ou youtu.be).");

    const startSeconds = parseTimestamp(payload.start) ?? parsed.startSeconds ?? 0;
    const requestedEnd = parseTimestamp(payload.end);
    const maxSeconds = VIDEO_MAX_MINUTES * 60;
    if (requestedEnd !== null && requestedEnd <= startSeconds) throw new VideoError("O fim do trecho precisa vir depois do início.");
    if (requestedEnd !== null && requestedEnd - startSeconds > maxSeconds) {
      throw new VideoError(`Escolha um trecho de até ${VIDEO_MAX_MINUTES} minutos por vez.`);
    }
    const endSeconds = requestedEnd ?? startSeconds + maxSeconds;

    const sourceUrl = videoSourceKey(parsed.id, startSeconds, endSeconds);
    const prisma = getPrisma();

    // O aluno já adicionou este trecho: devolve o mesmo material.
    const existing = await prisma.uploadedFile.findFirst({ where: { userId: user.id, sourceUrl }, select: { id: true } });
    if (existing) return NextResponse.json({ fileId: existing.id, reused: true });

    const meta = await fetchVideoMeta(parsed.id);
    // Vídeos por dia dependem do plano (bloqueado no Gratuito). O trecho repetido acima não gasta o limite.
    const ticket = await consumeFeature(user, "video_material");

    const range = startSeconds > 0 || requestedEnd !== null ? ` (${formatTimestamp(startSeconds)}–${requestedEnd !== null ? formatTimestamp(endSeconds) : "fim"})` : "";
    let file;
    try {
    file = await prisma.uploadedFile.create({
      data: {
        userId: user.id,
        name: `${meta.title}${range}`.slice(0, 200),
        type: YOUTUBE_FILE_TYPE,
        sizeBytes: 0,
        storagePath: `youtube/${parsed.id}`,
        sourceUrl,
      },
    });
    } catch (error) {
      await ticket.refund();
      throw error;
    }
    const fileId = file.id;

    after(async () => {
      await runWithAiCallContext({ userId: user.id, plan: ticket.tier, feature: "video_material" }, () => processVideoMaterial(fileId));
      try {
        revalidatePath("/dashboard/arquivos");
      } catch {
        // A tela também atualiza pelo realtime de uploaded_files.
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/arquivos");
    return NextResponse.json({ fileId: file.id, title: meta.title });
  } catch (error) {
    if (error instanceof VideoError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, { scope: "videos.create", fallback: "Não foi possível adicionar o vídeo." });
  }
}
