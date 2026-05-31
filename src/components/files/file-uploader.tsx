"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
    setLoading(false);
    toast[response.ok ? "success" : "error"](response.ok ? "Arquivo enviado para processamento." : "Falha no envio.");
    if (response.ok) router.refresh();
  }

  return (
    <div
      className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-white p-8 text-center shadow-sm"
      onDrop={(event) => {
        event.preventDefault();
        upload(event.dataTransfer.files[0]);
      }}
      onDragOver={(event) => event.preventDefault()}
    >
      <Upload className="mx-auto size-8 text-[#4F46E5]" />
      <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Arraste seu arquivo aqui</h3>
      <p className="mt-2 text-sm text-slate-500">PDF, DOC, DOCX ou TXT ate 20MB</p>
      <input ref={inputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(event) => upload(event.target.files?.[0])} />
      <Button className="mt-5 bg-[#4F46E5] text-white hover:bg-[#4338CA]" onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? "Enviando..." : "Selecionar arquivo"}
      </Button>
    </div>
  );
}
