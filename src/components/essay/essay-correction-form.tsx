"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PenTool } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EssayCorrectionForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return `${words} palavras · ${content.length} caracteres`;
  }, [content]);

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
    const data = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Nao foi possivel corrigir a redacao.");
      return;
    }

    toast.success("Redacao corrigida e salva.");
    setContent("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <Input name="title" required placeholder="Titulo da redacao" />
      <Input name="theme" required placeholder="Tema" />
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-80 resize-none rounded-xl" placeholder="Digite sua redacao aqui..." />
      <div className="flex flex-col justify-between gap-3 text-sm text-[#64748B] sm:flex-row sm:items-center">
        <span>{stats}</span>
        <Button type="submit" disabled={loading || content.length < 300} className="gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
          <PenTool className="size-4" />
          {loading ? "Corrigindo..." : "Enviar para correcao"}
        </Button>
      </div>
    </form>
  );
}
