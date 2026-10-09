"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { QuestionCard } from "@/components/bank/question-card";
import { QuestionTools } from "@/components/bank/question-tools";
import { Button } from "@/components/ui/button";
import type { ClientQuestion } from "@/lib/bank/service";
import { intervalLabel, nextSchedule, type ReviewGrade } from "@/lib/bank/spaced";
import { readApiJson } from "@/lib/client-response";

export type ReviewItem = {
  question: ClientQuestion;
  correctLabel: string;
  explanation: string | null;
  source: "erro" | "marcada";
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

const GRADES: Array<{ grade: ReviewGrade; label: string; style: string }> = [
  { grade: "again", label: "Errei", style: "border-danger text-danger hover:bg-danger-tint" },
  { grade: "hard", label: "Difícil", style: "border-border-strong text-ink hover:bg-surface-muted" },
  { grade: "good", label: "Bom", style: "border-brand bg-brand text-on-brand hover:bg-brand-strong" },
  { grade: "easy", label: "Fácil", style: "border-success text-success hover:bg-success-tint" },
];

/**
 * Revisão em formato de flashcard: a questão é a frente; ao virar aparecem a resposta e a resolução.
 * A nota (errei, difícil, bom, fácil) define quando ela volta.
 */
export function ReviewRunner({ items }: { items: ReviewItem[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(0);
  const item = items[index];

  if (!item || done === items.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <RotateCcw className="mx-auto size-8 text-brand-strong" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold text-ink">{items.length ? "Revisão do dia concluída" : "Nenhuma questão para revisar agora"}</h2>
        <p className="m-0 mt-2 text-sm text-ink-muted">
          {items.length ? "As questões voltam nos dias certos, pouco antes de você esquecer." : "As questões que você errar ou marcar no banco entram aqui e voltam em intervalos crescentes."}
        </p>
        <Link href="/dashboard/banco" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong">
          Praticar mais questões
        </Link>
      </div>
    );
  }

  async function grade(value: ReviewGrade) {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/bank/reviews/${item.question.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade: value }) });
      const data = await readApiJson(response, "Não foi possível salvar a revisão.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a revisão.");
      setDone((count) => count + 1);
      setFlipped(false);
      setChoice(null);
      setIndex((position) => position + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a revisão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-7">
      <p className="m-0 text-sm text-ink-muted">
        Revisão {index + 1} de {items.length} · {item.source === "erro" ? "questão que você errou" : "questão que você marcou"}
      </p>
      <QuestionCard question={item.question} selected={choice} correctLabel={flipped ? item.correctLabel : null} locked={flipped} onSelect={setChoice} hideTags />

      {flipped ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
          <p className="m-0 text-[15px] font-bold text-ink">Resposta correta: alternativa {item.correctLabel}</p>
          {item.explanation ? <p className="m-0 whitespace-pre-line text-[15px] leading-7 text-ink">{item.explanation}</p> : null}
        </div>
      ) : (
        <Button onClick={() => setFlipped(true)} className="self-start">
          Ver a resposta
        </Button>
      )}

      {flipped ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((option) => {
            const next = nextSchedule({ easeFactor: item.easeFactor, intervalDays: item.intervalDays, repetitions: item.repetitions }, option.grade);
            return (
              <button key={option.grade} type="button" disabled={saving} onClick={() => grade(option.grade)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors disabled:opacity-60 ${option.style}`}>
                {option.label}
                <span className="text-[12px] font-normal opacity-80">volta {intervalLabel(next.intervalDays)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        <QuestionTools questionId={item.question.id} bookmarked={item.question.bookmarked} />
      </div>
    </section>
  );
}
