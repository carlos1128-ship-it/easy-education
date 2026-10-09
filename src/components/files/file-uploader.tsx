"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { usePlanOptional } from "@/components/plan/plan-provider";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";
import { fileTooLargeInfo } from "@/lib/plan-limits";
import { PLANS, uploadLimitMB } from "@/lib/plans";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ACCEPT = ".pdf,.txt,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/png,image/jpeg,image/webp";

export function FileUploader() {
  const router = useRouter();
  const plan = usePlanOptional();
  const tier = plan?.tier ?? "full";
  const maxMB = uploadLimitMB(tier);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing">("idle");

  async function upload(file?: File) {
    if (!file) return;
    const isImage = IMAGE_TYPES.includes(file.type);
    if (isImage && file.size > 10 * 1024 * 1024) {
      toast.error("Imagem acima de 10MB.");
      return;
    }
    // Tamanho máximo do plano: avisa antes de enviar (o servidor confere de novo).
    if (file.size > PLANS[tier].uploadMaxBytes) {
      plan?.openLimit(fileTooLargeInfo(tier, file.size));
      if (!plan) toast.error(`Arquivo acima de ${maxMB} MB.`);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setStatus("uploading");
    const response = await fetch("/api/files/upload", { method: "POST", body: formData });
    const data = await readApiJson<{ error?: string; file?: { id: string } }>(response, "Falha no envio.");
    if (!response.ok || !data.file?.id) {
      setStatus("idle");
      toast.error(data.error ?? "Falha no envio.");
      return;
    }

    // Processa na hora: PDF/TXT têm o texto extraído; imagens são lidas pela IA.
    setStatus("processing");
    router.refresh();
    const processed = await fetch(`/api/files/${data.file.id}/process`, { method: "POST" });
    const processData = await readApiJson<{ error?: string }>(processed, "Não foi possível ler o arquivo.");
    setStatus("idle");
    if (processed.ok) toast.success(isImage ? "Imagem lida pela IA e pronta para estudar." : "Arquivo enviado e pronto para estudar.");
    else toast.error(processData.error ?? "Arquivo enviado, mas não foi possível ler o conteúdo. Tente processar de novo.");
    router.refresh();
  }

  const busy = status !== "idle";

  return (
    <div
      className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center shadow-card"
      onDrop={(event) => {
        event.preventDefault();
        if (!busy) upload(event.dataTransfer.files[0]);
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      <Upload className="mx-auto size-8 text-brand-strong" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-bold text-ink">Arraste seu arquivo aqui</h3>
      <p className="mt-2 text-sm text-ink-muted">PDF ou TXT até {maxMB} MB · Foto (PNG, JPG ou WebP) até {Math.min(maxMB, 10)} MB</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={(event) => {
          upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy}>
        {status === "uploading" ? "Enviando..." : status === "processing" ? "Lendo o conteúdo..." : "Selecionar arquivo"}
      </Button>
    </div>
  );
}
