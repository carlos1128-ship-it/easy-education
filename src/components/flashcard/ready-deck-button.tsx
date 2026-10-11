"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

/** Adiciona o baralho pronto às revisões do aluno e abre o deck. */
export function ReadyDeckButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/flashcards/ready", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
      const data = await readApiJson<{ deckId?: string }>(response, "Não foi possível adicionar o baralho.");
      if (!response.ok || !data.deckId) throw new Error(data.error ?? "Não foi possível adicionar o baralho.");
      router.push(`/dashboard/flashcards/${data.deckId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar o baralho.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={busy}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      <Plus size={15} aria-hidden="true" /> {busy ? "Adicionando…" : "Estudar"}
    </button>
  );
}
