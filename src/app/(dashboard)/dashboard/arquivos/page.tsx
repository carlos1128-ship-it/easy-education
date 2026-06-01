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
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Arquivos</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Meus Arquivos</h1>
      </div>

      <FileUploader />

      {files.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-colors hover:border-[#4F46E5]/30"
            >
              <FileText className="size-6 text-[#4F46E5]" />
              <h2 className="mt-4 font-bold text-[#0F172A]">{file.name}</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {file.type || "arquivo"} · {formatBytes(file.sizeBytes)}
              </p>
              <span className="mt-4 inline-flex rounded-md bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#4F46E5]">
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
