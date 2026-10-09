"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import type { ActiveStudy } from "@/lib/active-study";
import { buildRoadmap } from "@/lib/study-roadmap";
import { cn } from "@/lib/utils";

/** Roteiro do bloco em andamento: as etapas para usar bem o tempo planejado, com o minuto sugerido de cada uma. */
export function StudyRoadmap({ active, onToggle }: { active: ActiveStudy; onToggle: (step: number) => void }) {
  const steps = buildRoadmap({ type: active.type, subject: active.subject, topic: active.topic, plannedMinutes: active.plannedMinutes, practiceHref: active.href });
  const done = new Set(active.done ?? []);

  return (
    <div className="w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-4 shadow-pop">
      <p className="m-0 text-[15px] font-bold text-ink">Roteiro do bloco</p>
      <p className="m-0 mt-0.5 text-[13px] text-ink-muted">
        {active.subject}
        {active.topic ? ` · ${active.topic}` : ""}
      </p>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {steps.map((step, index) => {
          const checked = done.has(index);
          return (
            <li key={step.title} className={cn("flex gap-2.5 rounded-xl p-2.5", checked ? "bg-success-tint" : "bg-surface-muted")}>
              <button
                type="button"
                onClick={() => onToggle(index)}
                aria-pressed={checked}
                aria-label={checked ? `Desmarcar ${step.title}` : `Marcar ${step.title} como feito`}
                className="mt-0.5 flex-none text-brand-strong"
              >
                {checked ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> : <Circle className="size-5" aria-hidden="true" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("m-0 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink", checked && "line-through opacity-70")}>
                  <span>{step.title}</span>
                  <span className="flex-none text-xs font-medium text-ink-muted">{step.minutes} min</span>
                </p>
                <p className="m-0 mt-0.5 text-[13px] leading-5 text-ink-muted">{step.detail}</p>
                {step.href ? (
                  step.external ? (
                    <a href={step.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-strong no-underline hover:underline">
                      Buscar aula no YouTube <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={step.href} className="mt-1 inline-block text-[13px] font-semibold text-brand-strong no-underline hover:underline">
                      Abrir
                    </Link>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
