"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

type Check = { wrong: number; recentDeck: { id: string; title: string; cards: number } | null };

/**
 * No resultado do quiz ou simulado: "Criar flashcards para revisar". Só gera quando o aluno pede (gasta IA).
 * Se já existe um deck recente do mesmo assunto, oferece adicionar a ele.
 */
export function QuizFlashcardsOffer({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    try {
      const response = await fetch(`/api/flashcards/from-quiz?quizId=${encodeURIComponent(quizId)}`, { cache: "no-store" });
      const data = await readApiJson<Check>(response, "Não foi possível consultar o quiz.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível consultar o quiz.");
      if (data.recentDeck) setCheck(data);
      else await create(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar o quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function create(deckId: string | null) {
    setBusy(true);
    try {
      const response = await fetch("/api/flashcards/from-quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quizId, deckId }) });
      const data = await readApiJson<{ deckId?: string; added?: number; appended?: boolean }>(response, "Não foi possível criar os flashcards.");
      if (!response.ok || !data.deckId) throw new Error(data.error ?? "Não foi possível criar os flashcards.");
      toast.success(data.appended ? `${data.added} cartões adicionados ao deck.` : `Deck criado com ${data.added} cartões.`);
      router.push(`/dashboard/flashcards/${data.deckId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar os flashcards.");
      setBusy(false);
    }
  }

  if (check?.recentDeck) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-xl bg-surface-muted p-4 text-sm">
        <p className="m-0 text-ink">
          Você já tem o deck <strong>{check.recentDeck.title}</strong> ({check.recentDeck.cards} cartões) deste assunto. Quer juntar os cartões novos a ele?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => create(check.recentDeck!.id)}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Adicionar ao deck
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => create(null)}>
            Criar deck novo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={ask} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Layers className="size-4" aria-hidden="true" />}
      {busy ? "Criando os cartões…" : "Criar flashcards para revisar"}
    </Button>
  );
}
