"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Lock, RotateCcw, Rocket, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { RichText } from "@/components/bank/rich-text";
import { ExplanationText } from "@/components/quiz/explanation-text";
import { OwlMascot, usePreloadOwls, type OwlMood } from "@/components/mascot/owl-mascot";
import { readApiJson } from "@/lib/client-response";
import type { ClientQuestion, Reveal } from "@/lib/bank/service";
import { playSound, primeSounds } from "@/lib/sounds";
import { XP_RULES } from "@/lib/xp";
import { cn } from "@/lib/utils";

type Answer = { selected: string; isCorrect: boolean; reveal: Reveal };

type Props = {
  sessionId: string;
  title: string;
  examName: string;
  questions: ClientQuestion[];
  initialAnswers: Record<string, Answer>;
  backHref: string;
  /** Recomeçar o treino da mesma matéria. */
  againBody: { exam: string; subject?: string };
};

const LABEL_SHORT_LIMIT = 70;

function resultMood(percent: number): { mood: OwlMood; title: string; text: string } {
  if (percent === 100) return { mood: "festa", title: "Gabaritou!", text: "Todas certas. Os examinadores que se cuidem." };
  if (percent >= 70) return { mood: "comemorando", title: "Mandou muito bem!", text: "Você está no ritmo de aprovação." };
  if (percent >= 50) return { mood: "feliz", title: "Bom treino!", text: "As erradas voltam na revisão para você fixar." };
  return { mood: "determinada", title: "Bora de novo!", text: "Errar no treino é o que faz acertar na prova." };
}

/**
 * Treino de provas anteriores: uma questão por vez, gabarito na hora, painel de "Boa!" ou "Oops" embaixo.
 * A questão ultrassecreta chega trancada no plano Básico (sem texto): dá para pular ou ver o plano Completo.
 */
export function PracticeRunner({ sessionId, title, examName, questions, initialAnswers, backHref, againBody }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [index, setIndex] = useState(() => {
    const open = questions.findIndex((question) => !initialAnswers[question.id]);
    return open === -1 ? questions.length : open;
  });
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const shownAt = useRef(0);
  const finished = useRef(false);
  usePreloadOwls(["comemorando", "determinada", "detetive", "festa"]);

  const question = questions[index];
  const answer = question ? answers[question.id] : undefined;
  const done = index >= questions.length;
  const answeredList = questions.flatMap((item) => (answers[item.id] ? [answers[item.id]] : []));
  const correctCount = answeredList.filter((item) => item.isCorrect).length;
  const streak = (() => {
    let count = 0;
    for (const item of questions.slice(0, index + 1).reverse()) {
      const value = answers[item.id];
      if (!value) continue;
      if (!value.isCorrect) break;
      count += 1;
    }
    return count;
  })();

  // Hora em que a questão apareceu (para o tempo gasto em cada uma).
  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  // Fim do treino: encerra a sessão (as erradas já foram para a revisão espaçada).
  useEffect(() => {
    if (!done || finished.current || !answeredList.length) return;
    finished.current = true;
    playSound("concluido");
    void fetch(`/api/bank/sessions/${sessionId}/finish`, { method: "POST" }).catch(() => undefined);
  }, [done, answeredList.length, sessionId]);

  async function confirm() {
    if (!question || !choice || busy || answer) return;
    primeSounds();
    setBusy(true);
    try {
      const response = await fetch("/api/bank/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, sessionId, selected: choice, timeMs: shownAt.current ? Date.now() - shownAt.current : 0 }),
      });
      const data = await readApiJson<{ isCorrect?: boolean; correctLabel?: string; explanation?: string | null; reviewStatus?: string }>(response, "Não foi possível salvar a resposta.");
      if (!response.ok || !data.correctLabel) throw new Error(data.error ?? "Não foi possível salvar a resposta.");
      const isCorrect = Boolean(data.isCorrect);
      playSound(isCorrect ? "acerto" : "erro");
      setAnswers((current) => ({ ...current, [question.id]: { selected: choice, isCorrect, reveal: { correctLabel: data.correctLabel as string, explanation: data.explanation ?? null, reviewStatus: data.reviewStatus ?? "nao_revisada" } } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a resposta.");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setChoice(null);
    setIndex((value) => value + 1);
  }

  function skip() {
    if (!question) return;
    setSkipped((current) => new Set(current).add(question.id));
    next();
  }

  async function restart() {
    setRestarting(true);
    try {
      const response = await fetch("/api/bank/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "past", ...againBody }) });
      const data = await readApiJson<{ sessionId?: string }>(response, "Não foi possível começar outro treino.");
      if (!response.ok || !data.sessionId) throw new Error(data.error ?? "Não foi possível começar outro treino.");
      router.push(`/dashboard/provas/treino/${data.sessionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível começar outro treino.");
      setRestarting(false);
    }
  }

  const progress = Math.round((Math.min(index, questions.length) / Math.max(questions.length, 1)) * 100);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 pb-40">
      {/* Topo: sair, barra de progresso e contagem */}
      <div className="flex items-center gap-4">
        <Link href={backHref} aria-label="Sair do treino" className="grid size-10 flex-none place-items-center rounded-full text-ink-muted no-underline transition-colors hover:bg-surface-muted hover:text-ink">
          <X size={22} aria-hidden="true" />
        </Link>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={Math.min(index, questions.length)} aria-label="Progresso do treino">
          <div className="h-full rounded-full bg-gradient-to-r from-success to-[#4ade80] transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="flex-none text-sm font-bold tabular-nums text-ink-muted">
          {Math.min(index + (done ? 0 : 1), questions.length)}/{questions.length}
        </span>
      </div>

      {done ? (
        <Summary
          total={answeredList.length}
          correct={correctCount}
          skipped={skipped.size}
          examName={examName}
          backHref={backHref}
          onRestart={restart}
          restarting={restarting}
        />
      ) : question ? (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
            {question.ultrasecret ? <span className="rounded-full bg-gradient-to-r from-brand to-[#7c3aed] px-3 py-1 font-bold text-white shadow-[0_4px_14px_rgb(79_70_229/0.35)]">Preferida dos examinadores</span> : null}
            <span className="rounded-full border border-border px-3 py-1 font-semibold text-ink">{question.source}</span>
            {question.subjectName ? <span className="rounded-full bg-success-tint px-3 py-1 font-medium text-success">{question.subjectName}</span> : null}
            {streak >= 2 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-tint px-3 py-1 font-bold text-warning">
                <Zap size={13} aria-hidden="true" /> {streak} seguidas
              </span>
            ) : null}
            <span className="ml-1 text-xs text-ink-muted">{title}</span>
          </div>

          {question.locked ? <LockedQuestion question={question} examName={examName} onSkip={skip} /> : (
            <section className="flex flex-col gap-6">
              {question.ultrasecret ? (
                <div className="flex items-center gap-3 self-center rounded-2xl border border-brand/40 bg-brand-tint px-4 py-2.5">
                  <OwlMascot mood="detetive" size={64} className="flex-none" />
                  <p className="m-0 max-w-[420px] text-sm font-medium text-ink">
                    <span className="font-bold text-brand-strong">Ultrassecreta.</span> Esta questão é de um dos assuntos que mais caem na {examName}. Capriche!
                  </p>
                </div>
              ) : null}
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4 text-[16px] leading-7 text-ink">
                {question.supportText ? <RichText text={question.supportText} className="flex flex-col" /> : null}
                {question.statement ? <RichText text={question.statement} className="font-medium" /> : null}
              </div>
              <Options question={question} answer={answer} choice={choice} onChoose={setChoice} />
            </section>
          )}
        </>
      ) : null}

      {/* Rodapé: confirmar, ou o painel do resultado da questão */}
      {!done && question && !question.locked ? (
        <Footer answer={answer} choice={choice} busy={busy} onConfirm={confirm} onNext={next} isLast={index === questions.length - 1} streak={streak} />
      ) : null}
    </div>
  );
}

function Options({ question, answer, choice, onChoose }: { question: ClientQuestion; answer?: Answer; choice: string | null; onChoose: (label: string) => void }) {
  const short = question.options.every((option) => !option.imageUrl && option.text.length <= LABEL_SHORT_LIMIT);
  return (
    <ol className={cn("mx-auto m-0 grid w-full max-w-[860px] list-none gap-3 p-0", short && "md:grid-cols-2")} role="radiogroup" aria-label="Alternativas">
      {question.options.map((option) => {
        const correct = answer?.reveal.correctLabel;
        const state = correct
          ? option.label === correct
            ? answer?.selected === option.label ? "correct" : "missed"
            : answer?.selected === option.label ? "wrong" : "idle"
          : choice === option.label ? "selected" : "idle";
        return (
          <li key={option.label}>
            <button
              type="button"
              role="radio"
              aria-checked={(answer?.selected ?? choice) === option.label}
              disabled={Boolean(answer)}
              onClick={() => onChoose(option.label)}
              className={cn(
                "group flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl border-2 border-b-4 p-3.5 text-left text-[15px] leading-6 transition-all disabled:cursor-default",
                state === "idle" && "border-border bg-surface text-ink hover:-translate-y-0.5 hover:border-brand/50",
                state === "selected" && "border-brand bg-brand-tint text-ink",
                state === "correct" && "border-success bg-success-tint text-ink",
                state === "missed" && "border-success/70 bg-surface text-ink",
                state === "wrong" && "border-danger bg-danger-tint text-ink",
              )}
            >
              <span
                className={cn(
                  "grid size-9 flex-none place-items-center rounded-xl border-2 text-sm font-bold",
                  state === "idle" && "border-border-strong text-ink-muted group-hover:border-brand group-hover:text-brand-strong",
                  state === "selected" && "border-brand bg-brand text-on-brand",
                  (state === "correct" || state === "missed") && "border-success bg-success text-white dark:text-[#052e16]",
                  state === "wrong" && "border-danger bg-danger text-white dark:text-[#2a0a0a]",
                )}
                aria-hidden="true"
              >
                {state === "correct" || state === "missed" ? <Check size={18} strokeWidth={3} /> : state === "wrong" ? <X size={18} strokeWidth={3} /> : option.label}
              </span>
              <span className="min-w-0 flex-1">
                {option.text}
                {option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- figura da alternativa (prova oficial)
                  <img src={option.imageUrl} alt={`Alternativa ${option.label}`} loading="lazy" className="mt-1 max-h-48 max-w-full rounded-lg border border-border bg-white object-contain" />
                ) : null}
              </span>
              {state === "correct" || state === "missed" ? <span className="sr-only">(alternativa correta)</span> : null}
              {state === "wrong" ? <span className="sr-only">(sua resposta, incorreta)</span> : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Footer({ answer, choice, busy, onConfirm, onNext, isLast, streak }: { answer?: Answer; choice: string | null; busy: boolean; onConfirm: () => void; onNext: () => void; isLast: boolean; streak: number }) {
  const nextLabel = isLast ? "Ver resultado" : answer?.isCorrect ? "Continuar" : "Entendi, vamos lá";
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur lg:left-[248px]",
        !answer && "border-border bg-surface/95",
        answer?.isCorrect && "border-success/40 bg-success-tint",
        answer && !answer.isCorrect && "border-danger/40 bg-danger-tint",
      )}
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[960px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {answer ? (
          <div className="flex min-w-0 items-start gap-3">
            <OwlMascot mood={answer.isCorrect ? (streak >= 3 ? "festa" : "comemorando") : "determinada"} size={68} className="-my-2 hidden flex-none sm:flex" />
            <div className="min-w-0">
              <p className={cn("m-0 flex items-center gap-2 text-lg font-extrabold", answer.isCorrect ? "text-success" : "text-danger")}>
                {answer.isCorrect ? <Check size={20} strokeWidth={3} aria-hidden="true" /> : <X size={20} strokeWidth={3} aria-hidden="true" />}
                {answer.isCorrect ? `Boa! +${XP_RULES.correct} XP` : "Oops"}
              </p>
              {!answer.isCorrect ? <p className="m-0 text-sm font-medium text-ink">Resposta certa: alternativa {answer.reveal.correctLabel}. Ela volta na sua revisão.</p> : null}
              {answer.reveal.explanation ? (
                <details className="mt-1 text-sm text-ink">
                  <summary className="cursor-pointer font-semibold text-brand-strong">Ver resolução</summary>
                  <div className="mt-2 max-h-48 overflow-y-auto pr-2"><ExplanationText text={answer.reveal.explanation} /></div>
                </details>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="m-0 hidden text-sm text-ink-muted md:block">{choice ? `Alternativa ${choice} marcada.` : "Escolha uma alternativa."}</p>
        )}
        {answer ? (
          <button type="button" onClick={onNext} autoFocus className={cn("inline-flex min-h-12 flex-none items-center justify-center gap-2 rounded-xl border-b-4 px-8 text-[15px] font-bold transition-transform active:translate-y-0.5", answer.isCorrect ? "border-[#15803d] bg-success text-white dark:text-[#052e16]" : "border-[#b91c1c] bg-danger text-white dark:text-[#2a0a0a]")}>
            {nextLabel} <ArrowRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" onClick={onConfirm} disabled={!choice || busy} className="inline-flex min-h-12 flex-none items-center justify-center rounded-xl border-b-4 border-brand-strong bg-brand px-8 text-[15px] font-bold text-on-brand transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-track disabled:text-ink-muted">
            {busy ? "Conferindo…" : "Confirmar"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Questão ultrassecreta no plano Básico: texto borrado, cadeados, coruja detetive e as saídas (Completo ou pular). */
function LockedQuestion({ question, examName, onSkip }: { question: ClientQuestion; examName: string; onSkip: () => void }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-[760px] items-center gap-4">
        <OwlMascot mood="detetive" size={150} className="flex-none" priority />
        <div className="relative flex-1 rounded-2xl border-2 border-brand/50 bg-surface p-5 shadow-[0_0_32px_rgb(79_70_229/0.18)] before:absolute before:-left-[9px] before:top-1/2 before:size-4 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-l-2 before:border-brand/50 before:bg-surface">
          <div className="flex flex-col gap-2 blur-[5px] select-none" aria-hidden="true">
            <span className="h-3 w-[92%] rounded bg-track" />
            <span className="h-3 w-[80%] rounded bg-track" />
            <span className="h-3 w-[66%] rounded bg-track" />
          </div>
          <div className="absolute inset-0 grid place-items-center">
            <span className="inline-flex flex-col items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand"><Lock size={16} aria-hidden="true" /></span>
              <span className="rounded-full bg-white px-4 py-1.5 text-sm font-extrabold tracking-wide text-brand-strong shadow-card">QUESTÃO ULTRASSECRETA</span>
            </span>
          </div>
        </div>
      </div>
      <ol className="mx-auto m-0 grid w-full max-w-[860px] list-none gap-3 p-0 md:grid-cols-2" aria-label="Alternativas trancadas">
        {question.options.map((option) => (
          <li key={option.label} className="flex min-h-[64px] items-center gap-3.5 rounded-2xl border-2 border-b-4 border-brand/40 bg-surface p-3.5 text-ink-muted">
            <span className="grid size-9 flex-none place-items-center rounded-xl border-2 border-brand/50 text-sm font-bold text-brand-strong">{option.label}</span>
            <span className="h-3 flex-1 rounded bg-track blur-[3px]" aria-hidden="true" />
            <Lock size={18} className="flex-none text-brand-strong" aria-hidden="true" />
          </li>
        ))}
      </ol>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-brand/40 bg-surface/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[960px] flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 flex items-center gap-2 text-lg font-extrabold text-brand-strong">
              <Rocket size={20} aria-hidden="true" /> Questão premium
            </p>
            <Link href="/assinar?plano=completo" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-brand px-4 text-sm font-bold text-brand-strong no-underline hover:bg-brand-tint">
              Ver plano Completo
            </Link>
          </div>
          <p className="m-0 text-sm text-ink">
            É de um dos assuntos que mais caem na {examName}: a preferida dos examinadores. No plano Completo você desbloqueia estas questões, com gabarito e resolução.
          </p>
          <button type="button" onClick={onSkip} autoFocus className="min-h-12 w-full rounded-xl border-2 border-b-4 border-border-strong bg-surface text-[15px] font-bold text-ink transition-transform hover:bg-surface-muted active:translate-y-0.5">
            Pular pergunta premium
          </button>
        </div>
      </div>
    </section>
  );
}

function Summary({ total, correct, skipped, examName, backHref, onRestart, restarting }: { total: number; correct: number; skipped: number; examName: string; backHref: string; onRestart: () => void; restarting: boolean }) {
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const mood = resultMood(percent);
  const xp = correct * XP_RULES.correct + (total - correct) * XP_RULES.wrong;
  return (
    <section className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-5 py-6 text-center">
      <OwlMascot mood={mood.mood} size={210} priority />
      <div>
        <h1 className="m-0 text-3xl font-extrabold tracking-[-0.02em] text-ink">{mood.title}</h1>
        <p className="m-0 mt-1 text-ink-muted">{mood.text}</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-success/40 bg-success-tint p-3">
          <div className="text-2xl font-extrabold text-success">{correct}/{total}</div>
          <div className="text-xs font-medium text-ink-muted">acertos</div>
        </div>
        <div className="rounded-2xl border-2 border-brand/40 bg-brand-tint p-3">
          <div className="text-2xl font-extrabold text-brand-strong">{percent}%</div>
          <div className="text-xs font-medium text-ink-muted">aproveitamento</div>
        </div>
        <div className="rounded-2xl border-2 border-warning/40 bg-warning-tint p-3">
          <div className="text-2xl font-extrabold text-warning">+{xp}</div>
          <div className="text-xs font-medium text-ink-muted">XP</div>
        </div>
      </div>
      {skipped ? <p className="m-0 text-sm text-ink-muted">{skipped === 1 ? "1 questão ultrassecreta ficou para o plano Completo." : `${skipped} questões ultrassecretas ficaram para o plano Completo.`}</p> : null}
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} disabled={restarting} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-b-4 border-brand-strong bg-brand px-6 font-bold text-on-brand disabled:opacity-60">
          <RotateCcw size={18} aria-hidden="true" /> {restarting ? "Montando…" : "Treinar de novo"}
        </button>
        <Link href={backHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-b-4 border-border-strong bg-surface px-6 font-bold text-ink no-underline hover:bg-surface-muted">
          Voltar para {examName}
        </Link>
      </div>
    </section>
  );
}
