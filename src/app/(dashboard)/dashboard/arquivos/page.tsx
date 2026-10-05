import { FileText } from "lucide-react";
import { FileActions } from "@/components/files/file-actions";
import { FileUploader } from "@/components/files/file-uploader";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function ArquivosPage({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { busca } = await searchParams;
  const files = await getPrisma().uploadedFile.findMany({
    where: { userId: user.id, name: busca ? { contains: busca, mode: "insensitive" } : undefined },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, sizeBytes: true, processed: true },
  });

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Arquivos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Meus Arquivos</h1>
      </div>

      <FileUploader />

      {files.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong"
            >
              <FileText className="size-6 text-brand-strong" />
              <h2 className="mt-4 font-bold text-ink">{file.name}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {file.type || "arquivo"} · {formatBytes(file.sizeBytes)}
              </p>
              <span className="mt-4 inline-flex rounded-md bg-brand-tint px-3 py-1 text-xs font-bold text-brand-strong">
                {file.processed ? "Pronto" : "Aguardando processamento"}
              </span>
              <FileActions fileId={file.id} fileName={file.name} processed={file.processed} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title="Nenhum arquivo enviado." description="Envie materiais reais para gerar quizzes e flashcards com base no seu conteúdo." />
      )}
    </div>
  );
}
