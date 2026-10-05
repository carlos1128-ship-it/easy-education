"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, PenTool } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/client-response";

export function EssayCorrectionForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return `${words} palavras · ${content.length} caracteres`;
  }, [content]);

  async function readPhoto(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem acima de 10MB.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setReading(true);
    const response = await fetch("/api/essay/transcribe", { method: "POST", body: formData });
    const data = await readApiJson<{ error?: string; text?: string }>(response, "Não foi possível ler a foto da redação.");
    setReading(false);
    if (!response.ok || !data.text) {
      toast.error(data.error ?? "Não foi possível ler a foto da redação.");
      return;
    }
    setContent(data.text);
    toast.success("Redação transcrita. Confira o texto e envie para correção.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/essay/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        theme: String(formData.get("theme") ?? ""),
        model: "ENEM",
        content,
      }),
    });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Não foi possível corrigir a redação.",
    );
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Não foi possível corrigir a redação.");
      return;
    }

    toast.success("Redação corrigida e salva.");
    setContent("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Input name="title" required placeholder="Título da redação" />
      <Input name="theme" required placeholder="Tema" />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border-strong p-3">
        <input
          ref={photoRef}
          type="file"
          className="hidden"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(event) => {
            readPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={reading || loading} onClick={() => photoRef.current?.click()}>
          <ImageUp className="size-4" aria-hidden="true" />
          {reading ? "Lendo a foto..." : "Enviar foto da redação"}
        </Button>
        <span className="text-sm text-ink-muted">Escreveu no papel? Envie uma foto (PNG, JPG ou WebP) e a IA transcreve o texto aqui.</span>
      </div>
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-80 resize-none rounded-lg" placeholder="Digite sua redação aqui..." />
      <div className="flex flex-col justify-between gap-3 text-sm text-ink-muted sm:flex-row sm:items-center">
        <span>{stats}</span>
        <Button type="submit" disabled={loading || content.length < 300} className="gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
          <PenTool className="size-4" />
          {loading ? "Corrigindo..." : "Enviar para correção"}
        </Button>
      </div>
    </form>
  );
}
