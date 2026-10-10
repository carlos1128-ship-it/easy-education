"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { SpeakButton } from "@/components/audio/speak-button";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

type Flashcard = {
  id: string;
  front: string;
  back: string;
  /** "erro" (veio de uma questão que o aluno errou), "conceito" ou "resumo" (erro no resumo do dia). */
  sourceKind?: string | null;
};

const SOURCE_LABEL: Record<string, string> = { erro: "Veio de uma questão que você errou", resumo: "Veio de um erro no seu resumo do dia" };

export function FlashcardReview({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const card = cards[index];
  const done = cards.length > 0 && reviewed.size === cards.length;

  async function review(quality: "again" | "medium" | "good") {
    if (!card || saving) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/flashcards/${card.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      const data = await readApiJson(response, "Não foi possível salvar a revisão.");

      if (!response.ok) {
        toast.error(data.error ?? "Não foi possível salvar a revisão.");
        return;
      }

      setReviewed((current) => new Set(current).add(card.id));
      setFlipped(false);
      setIndex((value) => Math.min(value + 1, cards.length - 1));
    } catch {
      toast.error("Não foi possível salvar a revisão.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCard() {
    if (saving) return;
    setFlipped((value) => !value);
  }

  if (!cards.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <h2 className="text-xl font-bold text-ink">Nenhum card pendente</h2>
        <p className="mt-2 text-sm text-ink-muted">Quando houver cards para revisar, eles aparecem aqui.</p>
        <Link href="/dashboard/flashcards" className="mt-5 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-strong">
          Voltar aos decks
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <h2 className="text-2xl font-bold text-ink">Revisão concluída</h2>
        <p className="mt-2 text-sm text-ink-muted">{cards.length} cards reagendados por repeticao espacada.</p>
        <Link href="/dashboard/flashcards" className="mt-5 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-strong">
          Ver decks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 text-center text-sm font-medium text-ink-muted">
        Card {index + 1} de {cards.length}
        {card.sourceKind && SOURCE_LABEL[card.sourceKind] ? <span className="ml-2 rounded-full bg-warning-tint px-2 py-0.5 text-xs font-semibold text-warning">{SOURCE_LABEL[card.sourceKind]}</span> : null}
      </div>
      <button type="button" onClick={toggleCard} disabled={saving} className="h-80 w-full [perspective:1000px] disabled:cursor-wait lg:h-[440px]">
        <div className={`relative h-full rounded-2xl border border-border bg-surface p-8 shadow-card transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden]">
            <h1 className="text-center text-2xl font-bold text-ink lg:text-[32px] lg:leading-tight">{card.front}</h1>
          </div>
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-center text-lg leading-8 text-ink-muted lg:text-xl lg:leading-9">{card.back}</p>
          </div>
        </div>
      </button>
      <div className="mt-3 flex justify-center">
        <SpeakButton key={`${card.id}-${flipped}`} text={flipped ? card.back : card.front} label={flipped ? "Ouvir a resposta" : "Ouvir a pergunta"} />
      </div>
      {flipped ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button variant="outline" disabled={saving} onClick={() => review("again")}>Não sabia</Button>
          <Button variant="outline" disabled={saving} onClick={() => review("medium")}>Mais ou menos</Button>
          <Button className="rounded-lg bg-brand text-on-brand hover:bg-brand-strong" disabled={saving} onClick={() => review("good")}>
            {saving ? "Salvando..." : "Sabia bem"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-ink-muted">Clique no card para ver a resposta.</p>
      )}
    </div>
  );
}
