"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlay } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiJson } from "@/lib/client-response";

/** Cola um link do YouTube: a IA lê o vídeo e gera anotações com marcas de tempo para quiz, flashcards e simulado. */
export function YouTubeLinkForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRange, setShowRange] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    try {
      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: String(formData.get("url") ?? ""),
          start: String(formData.get("start") ?? "") || undefined,
          end: String(formData.get("end") ?? "") || undefined,
        }),
      });
      const data = await readApiJson<{ error?: string; reused?: boolean }>(response, "Não foi possível adicionar o vídeo.");
      if (!response.ok) {
        toast.error(data.error ?? "Não foi possível adicionar o vídeo.");
        return;
      }
      toast.success(data.reused ? "Você já tinha adicionado este vídeo." : "Vídeo adicionado. A IA está assistindo; leva cerca de 1 minuto.");
      form.reset();
      setShowRange(false);
      router.refresh();
    } catch {
      toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
      <div className="flex items-start gap-3">
        <div className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong">
          <CirclePlay className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">Estudar com um vídeo do YouTube</h2>
          <p className="m-0 mt-1 text-sm text-ink-muted">
            Cole o link de uma aula. A IA assiste, faz anotações com o minuto de cada assunto e você gera quiz, flashcards ou simulado. Errou? A explicação mostra onde rever no vídeo.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input name="url" required inputMode="url" placeholder="https://www.youtube.com/watch?v=..." aria-label="Link do vídeo do YouTube" className="flex-1" />
        <Button type="submit" disabled={loading} className="rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
          {loading ? "Adicionando..." : "Adicionar vídeo"}
        </Button>
      </div>
      {showRange ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-ink">
            Começar em
            <Input name="start" placeholder="0:00" className="mt-1" />
          </label>
          <label className="text-sm text-ink">
            Terminar em
            <Input name="end" placeholder="20:00" className="mt-1" />
          </label>
        </div>
      ) : (
        <button type="button" onClick={() => setShowRange(true)} className="mt-3 text-sm font-medium text-brand-strong hover:underline">
          Vídeo longo? Escolher só um trecho
        </button>
      )}
      <p className="m-0 mt-3 text-xs text-ink-muted">Só vídeos públicos. Em vídeos longos, escolha o trecho que você quer estudar. As questões refletem o conteúdo do vídeo, que pode conter erros.</p>
    </form>
  );
}
