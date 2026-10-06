import type { User } from "@supabase/supabase-js";
import { getAccessState } from "@/lib/billing";
import { generateTextFromYouTube } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/study-stats";

/** Tipo salvo em `uploaded_files.type` para vídeos do YouTube. */
export const YOUTUBE_FILE_TYPE = "video/youtube";

/** Trecho máximo lido de uma vez. Vídeos maiores: o aluno escolhe o trecho. */
export const VIDEO_MAX_MINUTES = Number(process.env.VIDEO_MAX_MINUTES ?? 60);

/** Vídeos por dia em cada plano (o custo é ~100 tokens por segundo de vídeo). */
const DAILY_VIDEOS = {
  basic: Number(process.env.AI_DAILY_VIDEOS_BASIC ?? 3),
  full: Number(process.env.AI_DAILY_VIDEOS ?? 10),
};

export class VideoError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Aceita youtube.com/watch, youtu.be, shorts, embed, live e m.youtube.com. Devolve o ID e o início (?t=). */
export function parseYouTubeUrl(input: string): { id: string; startSeconds: number | null } | null {
  let url: URL;
  try {
    url = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = match?.[1] ?? null;
    }
  }
  if (!id || !ID_PATTERN.test(id)) return null;
  const t = url.searchParams.get("t") ?? url.searchParams.get("start");
  return { id, startSeconds: t ? parseTimestamp(t.replace(/s$/, "")) : null };
}

/** "12:34", "1:02:03", "754" ou "12m34s" para segundos. */
export function parseTimestamp(value: string | null | undefined): number | null {
  const text = value?.trim();
  if (!text) return null;
  const hms = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
  if (hms && (hms[1] || hms[2]) ) return Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 1) return Math.floor(parts[0]);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function formatTimestamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function watchUrl(id: string, startSeconds = 0) {
  return `https://www.youtube.com/watch?v=${id}${startSeconds > 0 ? `&t=${Math.floor(startSeconds)}s` : ""}`;
}

/** Chave do material: mesmo vídeo e mesmo trecho reaproveitam as anotações (não lê o vídeo de novo). */
export function videoSourceKey(id: string, startSeconds: number, endSeconds: number) {
  return `${watchUrl(id)}#trecho=${startSeconds}-${endSeconds}`;
}

export function parseVideoSourceKey(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/[?&]v=([A-Za-z0-9_-]{11}).*#trecho=(\d+)-(\d+)$/);
  return match ? { id: match[1], startSeconds: Number(match[2]), endSeconds: Number(match[3]) } : null;
}

/**
 * Título e canal pelo oEmbed público do YouTube (sem chave de API).
 * Também confirma que o vídeo existe e é público: privado ou removido responde 401/403/404.
 */
export async function fetchVideoMeta(id: string) {
  let response: Response;
  try {
    response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(id))}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new VideoError("Não foi possível falar com o YouTube agora. Tente de novo em instantes.", 503);
  }
  if (response.status === 401 || response.status === 403) {
    throw new VideoError("Este vídeo é privado ou não permite ser usado fora do YouTube. Use um vídeo público.");
  }
  if (response.status === 404 || response.status === 400) {
    throw new VideoError("Vídeo não encontrado. Ele pode ser privado, não listado ou ter sido removido.");
  }
  if (!response.ok) throw new VideoError("Não foi possível ler este vídeo agora. Tente de novo em instantes.", 503);
  const data = (await response.json()) as { title?: string; author_name?: string };
  return { title: (data.title ?? "Vídeo do YouTube").slice(0, 180), channel: (data.author_name ?? "").slice(0, 120) };
}

/** Limite diário de vídeos do plano. */
export async function assertDailyVideoQuota(user: Pick<User, "id" | "email">) {
  const access = await getAccessState(user);
  const limit = DAILY_VIDEOS[access.plan ?? "full"];
  const used = await getPrisma().uploadedFile.count({
    where: { userId: user.id, type: YOUTUBE_FILE_TYPE, createdAt: { gte: startOfToday() } },
  });
  if (used >= limit) {
    throw new VideoError(
      `Você chegou ao limite de ${limit} vídeos por hoje.${access.plan === "basic" ? " No plano Completo o limite é maior." : " Volte amanhã!"}`,
      429,
    );
  }
}

function notesInstruction(meta: { title: string; channel: string }, range: { startSeconds: number; endSeconds: number }) {
  const minutes = Math.max(1, Math.round((range.endSeconds - range.startSeconds) / 60));
  return `Você vai transformar este vídeo em material de estudo. Vídeo: "${meta.title}"${meta.channel ? ` (canal ${meta.channel})` : ""}, trecho de ${formatTimestamp(range.startSeconds)} a ${formatTimestamp(range.endSeconds)}.

Escreva ANOTAÇÕES DE ESTUDO completas, em português do Brasil, que permitam a alguém estudar sem assistir:
- Divida em tópicos na ordem do vídeo. Comece CADA tópico com a marca de tempo do vídeo original no formato [MM:SS] (ou [H:MM:SS] passando de 1 hora).
- Crie pelo menos um tópico a cada 2 minutos de vídeo (cerca de ${Math.max(4, Math.round(minutes / 2))} tópicos).
- Em cada tópico: a ideia principal, definições, exemplos citados, dados, fórmulas e passos mostrados na tela ou falados.
- Termos técnicos e frases em língua estrangeira ficam no original, com a tradução entre parênteses.
- Não invente o que não está no vídeo. Se uma parte não tiver conteúdo útil (vinheta, propaganda, conversa solta), pule.
- Termine com "Resumo:" em 3 a 5 frases.
Se o vídeo não tiver conteúdo que dê para estudar, responda só: SEM_CONTEUDO_UTIL.
Texto simples, sem markdown.`;
}

function publicVideoError(error: unknown) {
  if (error instanceof VideoError) return error.message;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("private") || message.includes("permission") || message.includes("not found")) {
    return "Não foi possível acessar o vídeo. Ele precisa ser público.";
  }
  if (message.includes("demorou") || message.includes("abort") || message.includes("timeout")) {
    return "O vídeo demorou demais para ser lido. Escolha um trecho menor e tente de novo.";
  }
  if (message.includes("429") || message.includes("503") || message.includes("overloaded") || message.includes("high demand")) {
    return "A IA está ocupada agora. Tente de novo em alguns minutos.";
  }
  return "Não foi possível ler este vídeo. Tente de novo ou escolha um trecho menor.";
}

/**
 * Lê o vídeo e grava as anotações no material. Se o mesmo vídeo/trecho já foi lido
 * (por qualquer aluno: é conteúdo público), copia as anotações sem gastar IA de novo.
 */
export async function processVideoMaterial(fileId: string) {
  const prisma = getPrisma();
  const file = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
  const source = parseVideoSourceKey(file?.sourceUrl);
  if (!file || !source) return;

  try {
    const cached = await prisma.uploadedFile.findFirst({
      where: { sourceUrl: file.sourceUrl, processed: true, textContent: { not: null }, id: { not: file.id } },
      select: { textContent: true },
      orderBy: { createdAt: "desc" },
    });
    let notes = cached?.textContent ?? null;
    if (!notes) {
      const meta = { title: file.name, channel: "" };
      const result = await generateTextFromYouTube(watchUrl(source.id), source, notesInstruction(meta, source));
      if (result.text.includes("SEM_CONTEUDO_UTIL") || result.text.length < 200) {
        throw new VideoError("Não encontramos conteúdo para estudar neste trecho (sem fala ou explicação). Tente outro vídeo ou trecho.");
      }
      // Tira negrito de markdown e frases de abertura ("Certamente! Aqui estão...") que às vezes escapam.
      const clean = result.text
        .replace(/\*\*/g, "")
        .replace(/^(?:claro|certamente|aqui est[aã]o)[^\n]*\n+/i, "")
        .trim();
      notes = `Vídeo: ${file.name}\nLink: ${watchUrl(source.id)}\nTrecho: ${formatTimestamp(source.startSeconds)} a ${formatTimestamp(source.endSeconds)}\n\n${clean}`;
      console.info("[video.process]", { model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
    }
    await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { textContent: notes, processed: true, processingError: null },
    });
  } catch (error) {
    console.error("[video.process]", error);
    await prisma.uploadedFile
      .update({ where: { id: file.id }, data: { processed: false, processingError: publicVideoError(error) } })
      .catch(() => undefined);
  }
}

/** Instrução extra para quiz e flashcards gerados de um vídeo: cada item aponta o minuto de origem. */
export function videoMaterialInstruction(kind: "quiz" | "flashcards") {
  return kind === "quiz"
    ? `\n- O material é a anotação de um vídeo, com marcas [MM:SS]. Termine CADA explicação com "Reveja no vídeo em MM:SS." usando a marca do trecho de onde a questão saiu.`
    : `\n- O material é a anotação de um vídeo, com marcas [MM:SS]. Termine CADA verso (back) com "(vídeo MM:SS)" usando a marca do trecho de onde o cartão saiu.`;
}

export function isVideoFile(file: { type: string } | null | undefined) {
  return file?.type === YOUTUBE_FILE_TYPE;
}
