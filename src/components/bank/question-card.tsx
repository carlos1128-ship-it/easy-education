"use client";

import { Sparkles } from "lucide-react";
import { RichText } from "@/components/bank/rich-text";
import { DIFFICULTY_LABEL, REVIEW_STATUS_LABEL, type Difficulty, type ReviewStatus } from "@/lib/bank/constants";
import type { ClientQuestion } from "@/lib/bank/service";
import { cn } from "@/lib/utils";

/** Selo "Gerada por IA" (nunca mostrado em questão de prova) e a frase de estilo do exame. */
export function AiBadge({ note }: { note: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-brand-tint px-3 py-2 text-brand-strong">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold">
        <Sparkles size={14} aria-hidden="true" /> Gerada por IA
      </span>
      {note ? <span className="text-xs font-medium">{note}</span> : null}
    </div>
  );
}

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "missed";

/** A questão: origem, texto de apoio, enunciado e alternativas. As alternativas só mudam de cor quando o pai manda. */
export function QuestionCard({
  question,
  selected,
  correctLabel,
  locked,
  onSelect,
  hideTags,
}: {
  question: ClientQuestion;
  selected: string | null;
  /** Só informado depois de responder (prática) ou na revisão. */
  correctLabel?: string | null;
  locked?: boolean;
  onSelect?: (label: string) => void;
  hideTags?: boolean;
}) {
  function stateFor(label: string): OptionState {
    if (correctLabel) {
      if (label === correctLabel) return selected === label ? "correct" : "missed";
      if (label === selected) return "wrong";
      return "idle";
    }
    return label === selected ? "selected" : "idle";
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded-full bg-surface-muted px-2.5 py-1 font-semibold text-ink">{question.source}</span>
        {hideTags ? null : (
          <>
            {question.areaName ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-muted">{question.areaName}</span> : null}
            {question.subjectName ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-muted">{question.subjectName}</span> : null}
            {question.topicName ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-muted">{question.topicName}</span> : null}
            {question.difficulty ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-muted">{DIFFICULTY_LABEL[question.difficulty as Difficulty] ?? question.difficulty} (estimada)</span> : null}
          </>
        )}
      </header>

      {question.isAi ? <AiBadge note={question.aiNote} /> : null}

      {question.supportText ? <RichText text={question.supportText} className="rounded-xl bg-surface-muted p-4 text-[15px] leading-7 text-ink" /> : null}
      {question.statement ? <p className="m-0 text-[16px] font-medium leading-7 text-ink">{question.statement}</p> : null}

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0" role="radiogroup" aria-label="Alternativas">
        {question.options.map((option) => {
          const state = stateFor(option.label);
          return (
            <li key={option.label}>
              <button
                type="button"
                role="radio"
                aria-checked={selected === option.label}
                disabled={locked}
                onClick={() => onSelect?.(option.label)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-[15px] leading-6 transition-colors disabled:cursor-default",
                  state === "idle" && "border-border bg-surface text-ink hover:border-border-strong hover:bg-surface-muted",
                  state === "selected" && "border-brand bg-brand-tint text-ink",
                  state === "correct" && "border-success bg-success-tint text-ink",
                  state === "missed" && "border-success bg-surface text-ink",
                  state === "wrong" && "border-danger bg-danger-tint text-ink",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 flex-none place-items-center rounded-full border text-[13px] font-bold",
                    state === "selected" && "border-brand bg-brand text-on-brand",
                    state === "correct" && "border-success bg-success text-surface",
                    state === "missed" && "border-success text-success",
                    state === "wrong" && "border-danger bg-danger text-surface",
                    state === "idle" && "border-border-strong text-ink-muted",
                  )}
                  aria-hidden="true"
                >
                  {option.label}
                </span>
                <span className="min-w-0 flex-1">
                  {option.text}
                  {option.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagem de alternativa (fonte externa)
                    <img src={option.imageUrl} alt={`Alternativa ${option.label}`} loading="lazy" className="mt-2 max-h-48 max-w-full rounded-lg border border-border bg-white object-contain" />
                  ) : null}
                </span>
                {state === "correct" || state === "missed" ? <span className="sr-only">(alternativa correta)</span> : null}
                {state === "wrong" ? <span className="sr-only">(sua resposta, incorreta)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export function ReviewStatusNote({ status }: { status: string }) {
  const label = REVIEW_STATUS_LABEL[status as ReviewStatus] ?? status;
  return <span className="text-xs text-ink-muted">{label}</span>;
}
