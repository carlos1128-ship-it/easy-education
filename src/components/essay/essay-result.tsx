import { AlertTriangle, Check, X } from "lucide-react";
import { ENEM_COMPETENCIES, INTERVENTION_ELEMENTS } from "@/lib/enem-essay";
import { cn } from "@/lib/utils";
import type { EssayFeedback } from "@/types";

function asFeedback(value: unknown): EssayFeedback | null {
  if (!value || typeof value !== "object") return null;
  const feedback = value as EssayFeedback;
  return feedback.criteria && typeof feedback.criteria === "object" ? feedback : null;
}

const barTone = (score: number) => (score >= 160 ? "bg-success" : score >= 120 ? "bg-brand" : score >= 80 ? "bg-warning" : "bg-danger");

/** Resultado da correção pela grade do Enem: nota, competências, proposta de intervenção e próximos passos. */
export function EssayResult({ title, score, feedback: raw }: { title: string; score: number; feedback: unknown }) {
  const feedback = asFeedback(raw);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="m-0 text-sm text-ink-muted">Último resultado</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-brand">{Math.round(score)}</span>
        <span className="text-sm text-ink-muted">de 1000</span>
      </div>
      <p className="m-0 mt-1 text-sm font-medium text-ink">{title}</p>

      {feedback?.zeroReason ? (
        <p className="mt-3 flex gap-2 rounded-xl bg-danger-tint p-3 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 flex-none text-danger" aria-hidden="true" />
          Nota zero: {feedback.zeroReason}.
        </p>
      ) : null}
      {feedback?.tangency ? (
        <p className="mt-3 rounded-xl bg-warning-tint p-3 text-sm text-ink">
          O texto tangenciou o tema (tratou só do assunto amplo). Pela grade, isso limita as competências II, III e V.
        </p>
      ) : null}
      {feedback?.humanRightsViolation ? (
        <p className="mt-3 rounded-xl bg-danger-tint p-3 text-sm text-ink">A proposta desrespeita os direitos humanos: a competência V fica com zero.</p>
      ) : null}

      {feedback ? (
        <>
          <ul className="m-0 mt-4 list-none space-y-3 p-0">
            {ENEM_COMPETENCIES.map((competency) => {
              const item = feedback.criteria[competency.key];
              if (!item) return null;
              return (
                <li key={competency.key}>
                  <details className="group">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-ink">
                          {competency.id} · {competency.name}
                        </span>
                        <span className="font-bold text-ink">{item.score}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                        <div className={cn("h-full rounded-full", barTone(item.score))} style={{ width: `${(item.score / 200) * 100}%` }} />
                      </div>
                    </summary>
                    <div className="mt-2 space-y-1.5 text-sm text-ink-muted">
                      {item.level ? <p className="m-0 text-xs italic">Grade: {item.level}</p> : null}
                      <p className="m-0">{item.feedback}</p>
                      {item.evidence && item.evidence !== "—" ? <p className="m-0">Trecho: “{item.evidence}”</p> : null}
                      {item.nextLevel ? <p className="m-0 font-medium text-ink">Para subir: {item.nextLevel}</p> : null}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>

          {feedback.interventionElements ? (
            <div className="mt-4">
              <p className="m-0 text-sm font-semibold text-ink">Proposta de intervenção</p>
              <ul className="m-0 mt-2 grid list-none gap-1 p-0 text-sm">
                {INTERVENTION_ELEMENTS.map((element) => {
                  const present = feedback.interventionElements?.[element.key];
                  return (
                    <li key={element.key} className="flex items-center gap-2 text-ink-muted">
                      {present ? <Check className="size-4 text-success" aria-hidden="true" /> : <X className="size-4 text-danger" aria-hidden="true" />}
                      {element.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {feedback.improvements?.length ? (
            <div className="mt-4">
              <p className="m-0 text-sm font-semibold text-ink">O que melhorar</p>
              <ul className="m-0 mt-1 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {feedback.improvements.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          {feedback.strengths?.length ? (
            <div className="mt-3">
              <p className="m-0 text-sm font-semibold text-ink">Pontos fortes</p>
              <ul className="m-0 mt-1 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {feedback.strengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}
          <p className="m-0 mt-4 text-sm text-ink-muted">{feedback.generalFeedback}</p>
          <p className="m-0 mt-3 text-xs text-ink-muted">
            Correção por IA seguindo a grade oficial do Enem (cartilha do INEP). É uma estimativa: a nota da banca pode variar.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Feedback salvo.</p>
      )}
    </div>
  );
}
