/**
 * Legenda (transcrição) de um vídeo do YouTube, lida sem IA e sem custo.
 *
 * Ler o vídeo direto com a IA custa ~100 tokens por segundo de vídeo; a transcrição do mesmo trecho tem
 * ~40 vezes menos tokens. Por isso o app tenta a legenda primeiro e só manda o vídeo para a IA quando o
 * vídeo não tem legenda (nem a automática) ou o YouTube não entrega.
 */

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
const TIMEOUT_MS = 10_000;

/** Clientes do app do YouTube: a versão web pede verificação extra e não devolve as faixas de legenda. */
const CLIENTS = [
  {
    context: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 30, hl: "pt", gl: "BR" },
    userAgent: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
  },
  {
    context: { clientName: "IOS", clientVersion: "20.10.4", deviceModel: "iPhone16,2", hl: "pt", gl: "BR" },
    userAgent: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3 like Mac OS X)",
  },
] as const;

type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string };
type Json3 = { events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }> };

export type Transcript = {
  /** Texto com marcas [MM:SS] a cada bloco, só do trecho pedido. */
  text: string;
  language: string;
  automatic: boolean;
  /** Duração total do vídeo em segundos (do YouTube), quando veio. */
  lengthSeconds: number | null;
};

/** Escolhe a faixa: português feita por pessoa > português automática > outra feita por pessoa > qualquer uma. */
export function pickTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  const isPt = (track: CaptionTrack) => track.languageCode.toLowerCase().startsWith("pt");
  const manual = (track: CaptionTrack) => track.kind !== "asr";
  return tracks.find((t) => isPt(t) && manual(t)) ?? tracks.find(isPt) ?? tracks.find(manual) ?? tracks[0] ?? null;
}

function stamp(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

/** Junta as falas do trecho em blocos de ~30 s, cada um começando com a marca de tempo do vídeo original. */
export function transcriptText(data: Json3, startSeconds: number, endSeconds: number, blockSeconds = 30) {
  const lines: string[] = [];
  let blockStart = -1;
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) lines.push(`[${stamp(blockStart)}] ${text}`);
    buffer = [];
  };
  for (const event of data.events ?? []) {
    const at = (event.tStartMs ?? 0) / 1000;
    if (at < startSeconds || at >= endSeconds) continue;
    const text = (event.segs ?? []).map((seg) => seg.utf8 ?? "").join("").replace(/\n/g, " ").trim();
    if (!text) continue;
    if (blockStart < 0 || at - blockStart >= blockSeconds) {
      if (blockStart >= 0) flush();
      blockStart = at;
    }
    buffer.push(text);
  }
  if (blockStart >= 0) flush();
  return lines.join("\n");
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

/** Faixas de legenda e duração do vídeo. Null se o YouTube não entregar (vídeo sem legenda, bloqueio etc.). */
export async function fetchCaptionInfo(videoId: string) {
  for (const client of CLIENTS) {
    try {
      const data = await fetchJson<{
        playabilityStatus?: { status?: string };
        videoDetails?: { lengthSeconds?: string };
        captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } };
      }>(PLAYER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": client.userAgent },
        body: JSON.stringify({ context: { client: client.context }, videoId }),
      });
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      const track = pickTrack(tracks);
      if (data?.playabilityStatus?.status === "OK" && track) {
        const length = Number(data.videoDetails?.lengthSeconds);
        return { track, userAgent: client.userAgent, lengthSeconds: Number.isFinite(length) && length > 0 ? length : null };
      }
    } catch {
      // Tenta o próximo cliente.
    }
  }
  return null;
}

/** Transcrição do trecho, pronta para a IA resumir. Null se não houver legenda útil (aí a IA lê o vídeo). */
export async function fetchTranscript(videoId: string, startSeconds: number, endSeconds: number): Promise<Transcript | null> {
  const info = await fetchCaptionInfo(videoId);
  if (!info) return null;
  try {
    const url = `${info.track.baseUrl.replace(/&fmt=[^&]*/g, "")}&fmt=json3`;
    const data = await fetchJson<Json3>(url, { headers: { "User-Agent": info.userAgent } });
    if (!data) return null;
    const text = transcriptText(data, startSeconds, endSeconds);
    // Muito pouca fala no trecho (só música, vinheta): deixa a IA olhar o vídeo.
    if (text.length < 300) return null;
    return { text, language: info.track.languageCode, automatic: info.track.kind === "asr", lengthSeconds: info.lengthSeconds };
  } catch {
    return null;
  }
}
