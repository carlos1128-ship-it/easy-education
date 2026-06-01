"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Flashcard = {
  id: string;
  front: string;
  back: string;
};

export function FlashcardReview({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const card = cards[index];
  const done = cards.length > 0 && reviewed.size === cards.length;

  async function review(quality: "again" | "medium" | "good") {
    if (!card) return;
    const response = await fetch(`/api/flashcards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality }),
    });

    if (!response.ok) {
      toast.error("Não foi possível salvar a revisão.");
      return;
    }

    setReviewed((current) => new Set(current).add(card.id));
    setFlipped(false);
    setIndex((value) => Math.min(value + 1, cards.length - 1));
  }

  if (!cards.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-[20px] border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-[#0F172A]">Nenhum card pendente</h2>
        <p className="mt-2 text-sm text-[#64748B]">Quando houver cards para revisar, eles aparecem aqui.</p>
        <Link href="/dashboard/flashcards" className="mt-5 inline-flex h-9 items-center rounded-xl bg-[#4F46E5] px-4 text-sm font-medium text-white hover:bg-[#4338CA]">
          Voltar aos decks
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl rounded-[20px] border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-[#0F172A]">Revisão concluída</h2>
        <p className="mt-2 text-sm text-[#64748B]">{cards.length} cards reagendados por repeticao espacada.</p>
        <Link href="/dashboard/flashcards" className="mt-5 inline-flex h-9 items-center rounded-xl bg-[#4F46E5] px-4 text-sm font-medium text-white hover:bg-[#4338CA]">
          Ver decks
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 text-center text-sm font-medium text-[#64748B]">
        Card {index + 1} de {cards.length}
      </div>
      <button type="button" onClick={() => setFlipped((value) => !value)} className="h-80 w-full [perspective:1000px]">
        <div className={`relative h-full rounded-[20px] border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden]">
            <h1 className="text-center text-2xl font-bold text-[#0F172A]">{card.front}</h1>
          </div>
          <div className="absolute inset-0 grid place-items-center p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-center text-lg leading-8 text-[#64748B]">{card.back}</p>
          </div>
        </div>
      </button>
      {flipped ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Button variant="outline" onClick={() => review("again")}>Nao sabia</Button>
          <Button variant="outline" onClick={() => review("medium")}>Mais ou menos</Button>
          <Button className="rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]" onClick={() => review("good")}>Sabia bem</Button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-[#64748B]">Clique no card para ver a resposta.</p>
      )}
    </div>
  );
}
