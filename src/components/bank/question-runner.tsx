"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { QuestionCard, ReviewStatusNote } from "@/components/bank/question-card";
import { QuestionTools } from "@/components/bank/question-tools";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";
import type { ClientQuestion, Reveal } from "@/lib/bank/service";
import { cn } from "@/lib/utils";

export type RunnerAnswer = { selected: string; isCorrect?: boolean; reveal?: Reveal };

type Props = {
  /** Sem sessão = uma questão avulsa (da lista do banco ou gerada por IA): sempre mostra o gabarito na hora. */
  sessionId?: string;
  kind: "practice" | "simulado" | "diagnostic";
  title: string;
  questions: ClientQuestion[];
  initialAnswers: Record<string, RunnerAnswer>;
  /** Quando o simulado começou e quanto tempo tem (ms desde 1970 e segundos). */
  startedAtMs?: number;
  timeLimitSec?: number | null;
  backHref: string;
};

function formatClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function Countdown({ startedAtMs, limitSec, onEnd }: { startedAtMs: number; limitSec: number; onEnd: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, limitSec - Math.floor((Date.now() - startedAtMs) / 1000)));
  const ended = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, limitSec - Math.floor((Date.now() - startedAtMs) / 1000));
      setLeft(remaining);
      if (remaining === 0 && !ended.current) {
        ended.current = true;
        onEnd();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtMs, limitSec, onEnd]);

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold", left < 300 ? "bg-warning-tint text-warning" : "bg-surface-muted text-ink")} role="timer" aria-label="Tempo restante">
      <Clock size={15} aria-hidden="true" /> {formatClock(left)}
    </span>
  );
}

/** Responde uma questão por vez. Prática mostra gabarito e resolução na hora; simulado só no fim. */
export function QuestionRunner({ sessionId, kind, title, questions, initialAnswers, startedAtMs, timeLimitSec, backHref }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(() => {
    const firstOpen = questions.findIndex((question) => !initialAnswers[question.id]);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [answers, setAnswers] = useState<Record<string, RunnerAnswer>>(initialAnswers);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const shownAt = useRef<Record<string, number>>({});
  const spent = useRef<Record<string, number>>({});

  const question = questions[index];
  const timed = kind !== "practice";
  const saved = question ? answers[question.id] : undefined;
  const selected = question ? (saved?.selected ?? choice[question.id] ?? null) : null;
  const revealed = Boolean(saved?.reveal);
  const answeredCount = Object.keys(answers).length;
  const isLast = index === questions.length - 1;

  // Conta o tempo que a pessoa passa em cada questão (somando as visitas).
  useEffect(() => {
    if (!question) return;
    const id = question.id;
    const shown = shownAt.current;
    const total = spent.current;
    shown[id] = Date.now();
    return () => {
      total[id] = (total[id] ?? 0) + (Date.now() - (shown[id] ?? Date.now()));
    };
  }, [question]);

  const finish = useCallback(async () => {
    if (!sessionId || finishing) return;
    setFinishing(true);
    try {
      const response = await fetch(`/api/bank/sessions/${sessionId}/finish`, { method: "POST" });
      const data = await readApiJson(response, "Não foi possível encerrar a sessão.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível encerrar a sessão.");
      router.push(`/dashboard/banco/sessao/${sessionId}/resultado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
      setFinishing(false);
    }
  }, [sessionId, finishing, router]);

  async function confirm() {
    if (!question || !selected || busy || saved) return;
    setBusy(true);
    const timeMs = (spent.current[question.id] ?? 0) + (Date.now() - (shownAt.current[question.id] ?? Date.now()));
    try {
      const response = await fetch("/api/bank/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, sessionId, selected, timeMs }),
      });
      const data = await readApiJson<{ isCorrect?: boolean; correctLabel?: string; explanation?: string | null; reviewStatus?: string }>(response, "Não foi possível salvar a resposta.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a resposta.");
      const reveal = data.correctLabel ? { correctLabel: data.correctLabel, explanation: data.explanation ?? null, reviewStatus: data.reviewStatus ?? "nao_revisada" } : undefined;
      setAnswers((current) => ({ ...current, [question.id]: { selected, isCorrect: data.isCorrect, reveal } }));
      if (timed && !isLast) setIndex((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  if (!question) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <p className="m-0 text-ink-muted">Nenhuma questão nesta sessão.</p>
        <Link href={backHref} className="mt-4 inline-block font-semibold text-brand-strong underline">Voltar ao banco</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-medium text-brand-strong">{title}</p>
            <p className="m-0 text-[13px] text-ink-muted">
              Questão {index + 1} de {questions.length} · {answeredCount} respondida{answeredCount === 1 ? "" : "s"}
            </p>
          </div>
          {timed && startedAtMs && timeLimitSec ? <Countdown startedAtMs={startedAtMs} limitSec={timeLimitSec} onEnd={finish} /> : null}
        </div>

        <QuestionCard
          question={question}
          selected={selected}
          correctLabel={revealed ? saved?.reveal?.correctLabel : null}
          locked={Boolean(saved) || busy}
          onSelect={(label) => setChoice((current) => ({ ...current, [question.id]: label }))}
          hideTags={timed && !saved}
        />

        {saved && !revealed && timed ? <p className="m-0 rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-muted">Resposta salva. O gabarito e a resolução aparecem no resultado, como numa prova.</p> : null}

        {revealed && saved?.reveal ? (
          <div className={cn("flex flex-col gap-3 rounded-xl border p-4", saved.isCorrect ? "border-success bg-success-tint" : "border-danger bg-danger-tint")}>
            <p className="m-0 flex items-center gap-2 text-[15px] font-bold text-ink">
              {saved.isCorrect ? <CheckCircle2 size={18} className="text-success" aria-hidden="true" /> : <XCircle size={18} className="text-danger" aria-hidden="true" />}
              {saved.isCorrect ? "Você acertou!" : `Resposta correta: alternativa ${saved.reveal.correctLabel}`}
            </p>
            {saved.reveal.explanation ? (
              <div>
                <p className="m-0 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Resolução comentada</p>
                <p className="m-0 mt-1 whitespace-pre-line text-[15px] leading-7 text-ink">{saved.reveal.explanation}</p>
                <ReviewStatusNote status={saved.reveal.reviewStatus} />
              </div>
            ) : null}
            {!saved.isCorrect ? <p className="m-0 text-sm text-ink-muted">Esta questão entrou na sua revisão e volta amanhã.</p> : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <QuestionTools questionId={question.id} bookmarked={question.bookmarked} />
          <div className="flex flex-wrap gap-2">
            {timed && index > 0 ? (
              <Button variant="outline" onClick={() => setIndex((value) => value - 1)}>
                Anterior
              </Button>
            ) : null}
            {!saved ? (
              <Button onClick={confirm} disabled={!selected || busy}>
                {busy ? "Salvando..." : timed ? (isLast ? "Salvar resposta" : "Salvar e seguir") : "Confirmar resposta"}
              </Button>
            ) : timed && !isLast ? (
              <Button onClick={() => setIndex((value) => value + 1)}>
                Próxima <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
            {revealed && !timed && !isLast ? (
              <Button onClick={() => setIndex((value) => value + 1)}>
                Próxima <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
            {sessionId && (isLast || timed) && (saved || timed) ? (
              <Button variant={isLast && saved ? "default" : "outline"} onClick={finish} disabled={finishing}>
                {finishing ? "Encerrando..." : kind === "practice" ? "Ver resultado" : "Finalizar e ver resultado"}
              </Button>
            ) : null}
            {!sessionId && revealed ? (
              <Link href={backHref} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong">
                Voltar ao banco
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {questions.length > 1 ? (
        <aside className="h-fit rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="m-0 mb-3 text-sm font-semibold text-ink">Questões</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 xl:grid-cols-5" role="navigation" aria-label="Ir para a questão">
            {questions.map((item, position) => {
              const answer = answers[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (timed || answer ? setIndex(position) : undefined)}
                  disabled={!timed && !answer && position !== index}
                  aria-label={`Questão ${position + 1}${answer ? ", respondida" : ""}`}
                  aria-current={position === index ? "true" : undefined}
                  className={cn(
                    "grid h-9 place-items-center rounded-lg border text-[13px] font-semibold transition-colors",
                    position === index && "border-brand ring-2 ring-brand/30",
                    answer ? (answer.reveal ? (answer.isCorrect ? "border-success bg-success-tint text-success" : "border-danger bg-danger-tint text-danger") : "border-brand bg-brand-tint text-brand-strong") : "border-border text-ink-muted",
                  )}
                >
                  {position + 1}
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
