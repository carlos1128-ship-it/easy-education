"use client";

import { useState } from "react";
import { BookOpenCheck, Clock } from "lucide-react";
import { StartSessionButton } from "@/components/bank/start-session-button";
import { cn } from "@/lib/utils";

type Day = "dia1" | "dia2" | "completo";
type Language = "ingles" | "espanhol";

const OPTIONS: Array<{ day: Day; label: string; title: string; detail: string; questions: number; time: string }> = [
  { day: "dia1", label: "1º dia", title: "Linguagens e Ciências Humanas", detail: "45 de Linguagens (5 de língua estrangeira) e 45 de Humanas", questions: 90, time: "5h30" },
  { day: "dia2", label: "2º dia", title: "Ciências da Natureza e Matemática", detail: "45 de Natureza e 45 de Matemática", questions: 90, time: "5h" },
  { day: "completo", label: "Prova completa", title: "Os dois dias juntos", detail: "As quatro áreas, 45 questões de cada", questions: 180, time: "10h30" },
];

/** Escolha do simulado de provas anteriores do ENEM: qual dia e qual língua estrangeira. */
export function EnemPicker() {
  const [language, setLanguage] = useState<Language>("ingles");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink">Língua estrangeira:</span>
        {(["ingles", "espanhol"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            aria-pressed={language === value}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
              language === value ? "border-brand bg-brand-tint text-brand-strong" : "border-border text-ink-muted hover:text-ink",
            )}
          >
            {value === "ingles" ? "Inglês" : "Espanhol"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((option) => (
          <div key={option.day} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-strong">{option.label}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                <Clock className="size-3.5" aria-hidden="true" /> {option.time}
              </span>
            </div>
            <div>
              <h3 className="m-0 text-[17px] font-bold text-ink">{option.title}</h3>
              <p className="m-0 mt-1 text-sm text-ink-muted">{option.detail}</p>
            </div>
            <p className="m-0 mt-auto flex items-center gap-1.5 text-sm font-semibold text-ink">
              <BookOpenCheck className="size-4 text-brand-strong" aria-hidden="true" /> {option.questions} questões
            </p>
            <StartSessionButton body={{ kind: "enem", day: option.day, language }}>Começar</StartSessionButton>
          </div>
        ))}
      </div>
    </div>
  );
}
