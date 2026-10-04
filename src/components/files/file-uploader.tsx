"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

export function FileUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo acima de 20MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    const response = await fetch("/api/files/upload", { method: "POST", body: formData });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Falha no envio.",
    );
    setLoading(false);
    toast[response.ok ? "success" : "error"](response.ok ? "Arquivo enviado para processamento." : data.error ?? "Falha no envio.");
    if (response.ok) router.refresh();
  }

  return (
    <div
      className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center shadow-card"
      onDrop={(event) => {
        event.preventDefault();
        upload(event.dataTransfer.files[0]);
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      <Upload className="mx-auto size-8 text-brand-strong" />
      <h3 className="mt-4 text-lg font-bold text-ink">Arraste seu arquivo aqui</h3>
      <p className="mt-2 text-sm text-ink-muted">PDF ou TXT até 20MB</p>
      <input ref={inputRef} type="file" className="hidden" accept=".pdf,.txt,text/plain,application/pdf" onChange={(event) => upload(event.target.files?.[0])} />
      <Button className="mt-5 bg-brand text-on-brand hover:bg-brand-strong" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "Enviando..." : "Selecionar arquivo"}
      </Button>
    </div>
  );
}
