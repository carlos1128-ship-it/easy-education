import { CirclePlay, FileText } from "lucide-react";
import { FileActions } from "@/components/files/file-actions";
import { FileUploader } from "@/components/files/file-uploader";
import { PendingRefresh } from "@/components/files/pending-refresh";
import { YouTubeLinkForm } from "@/components/files/youtube-link-form";
import { LockedNotice, UsageHint } from "@/components/plan/usage-hint";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes } from "@/lib/format";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import { parseVideoSourceKey, watchUrl, YOUTUBE_FILE_TYPE } from "@/lib/youtube";

const STALE_MS = 7 * 60 * 1000;

/** Página do servidor: renderiza a cada pedido, então ler o relógio aqui é seguro. */
function staleThreshold() {
  return Date.now() - STALE_MS;
}

export default async function ArquivosPage({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const { user, access } = await getStudentOrRedirect();
  const videoLocked = allowanceFor(access.tier, "video_material").kind === "locked";
  const { busca } = await searchParams;
  const files = await getPrisma().uploadedFile.findMany({
    where: { userId: user.id, name: busca ? { contains: busca, mode: "insensitive" } : undefined },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, sizeBytes: true, processed: true, sourceUrl: true, processingError: true, createdAt: true },
  });

  // Leitura que passou do tempo máximo da função (5 min) e não gravou resultado: conta como falha, não fica "lendo" para sempre.
  const staleBefore = staleThreshold();
  const isStale = (file: (typeof files)[number]) => !file.processed && !file.processingError && file.createdAt.getTime() < staleBefore;

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Arquivos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Meus materiais</h1>
      </div>

      <PendingRefresh pending={files.some((file) => !file.processed && !file.processingError && !isStale(file))} />
      <div className="flex flex-wrap gap-2">
        <UsageHint feature="file_upload" />
        {videoLocked ? null : <UsageHint feature="video_material" />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FileUploader />
        {videoLocked ? (
          <LockedNotice
            feature="video_material"
            className="sm:flex-col sm:items-start"
            title="Estudar com vídeos do YouTube é dos planos pagos"
            description="Cole o link de uma aula e a IA gera anotações com o minuto de cada assunto, para virar quiz, flashcards ou simulado."
          />
        ) : (
          <YouTubeLinkForm />
        )}
      </div>

      {files.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {files.map((file) => {
            const isVideo = file.type === YOUTUBE_FILE_TYPE;
            const video = isVideo ? parseVideoSourceKey(file.sourceUrl) : null;
            const stale = isStale(file);
            const failed = Boolean(file.processingError) || stale;
            const status = file.processed
              ? "Pronto"
              : stale
                ? "Demorou demais. Apague e tente de novo"
                : failed
                ? "Não foi possível ler"
                : isVideo
                  ? "A IA está assistindo o vídeo…"
                  : "Aguardando processamento";
            return (
              <div
                key={file.id}
                className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong"
              >
                {isVideo ? <CirclePlay className="size-6 text-brand-strong" aria-hidden="true" /> : <FileText className="size-6 text-brand-strong" aria-hidden="true" />}
                <h2 className="mt-4 line-clamp-2 font-bold text-ink" title={file.name}>{file.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {isVideo && video ? (
                    <a href={watchUrl(video.id, video.startSeconds)} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-strong hover:underline">
                      Vídeo do YouTube ↗
                    </a>
                  ) : (
                    <>{file.type || "arquivo"} · {formatBytes(file.sizeBytes)}</>
                  )}
                </p>
                <span
                  className={`mt-4 inline-flex self-start rounded-md px-3 py-1 text-xs font-bold ${
                    failed ? "bg-danger-tint text-danger" : file.processed ? "bg-success-tint text-success" : "bg-brand-tint text-brand-strong"
                  }`}
                  role="status"
                >
                  {status}
                </span>
                {failed ? <p className="m-0 mt-2 text-sm text-ink-muted">{file.processingError}</p> : null}
                <FileActions fileId={file.id} fileName={file.name} processed={file.processed} isVideo={isVideo} failed={failed} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} title="Nenhum material ainda." description="Envie um PDF, uma foto ou cole o link de uma aula do YouTube para gerar quizzes, flashcards e simulados com base no seu conteúdo." />
      )}
    </div>
  );
}
