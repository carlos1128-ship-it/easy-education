"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ExternalLink, Pause, X } from "lucide-react";
import { toast } from "sonner";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import { NoteButton } from "@/components/notes/note-button";
import { useStudyRun } from "@/components/study-plan/study-run-provider";
import type { RunView } from "@/lib/study-runs";
import { cn } from "@/lib/utils";

/** Fechar o aviso de "bloco concluído" vale só nesta aba. */
const DISMISSED_KEY = "ee-run-dismissed";

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** Segundos estudados no bloco: os registrados mais o trecho do cronômetro em andamento (relógio do servidor). */
function useElapsed(run: RunView | null, clockOffset: number) {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(run?.timerStartedAt);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  if (!run) return 0;
  const segment = run.timerStartedAt ? (now + clockOffset - new Date(run.timerStartedAt).getTime()) / 1000 : 0;
  return run.studiedMinutes * 60 + Math.max(0, segment);
}

function usePanel() {
  const { run, clockOffset, setRun } = useStudyRun();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(readDismissed);
  const elapsed = useElapsed(run, clockOffset);
  const visible = run && !(run.status === "concluido" && dismissed === run.id);

  async function act(action: "pause" | "discard") {
    if (!run || busy) return;
    if (action === "discard" && !window.confirm("Parar sem registrar o tempo deste trecho? O bloco continua em andamento.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/study-plan/run/${run.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { run: RunView };
      setRun(data.run.status === "concluido" ? data.run : null);
      if (action === "pause") toast.success(data.run.status === "concluido" ? "Bloco concluído!" : "Tempo registrado. Use Continuar no plano para voltar a este bloco.");
      router.refresh();
    } catch {
      toast.error("Não foi possível pausar o bloco.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    if (!run) return;
    try {
      sessionStorage.setItem(DISMISSED_KEY, run.id);
    } catch {
      // Sem sessionStorage: some só até recarregar.
    }
    setDismissed(run.id);
  }

  /** O aluno marca ou desmarca uma etapa que já fez (as automáticas ficam marcadas). Atualiza na hora e confirma no servidor. */
  async function toggleStep(step: number) {
    if (!run || run.autoChecks[step]) return;
    const optimistic = { ...run, checks: run.checks.map((value, index) => (index === step ? !value : value)) };
    setRun(optimistic);
    try {
      const response = await fetch(`/api/study-plan/run/${run.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_step", step }) });
      if (!response.ok) throw new Error();
      setRun(((await response.json()) as { run: RunView }).run);
    } catch {
      setRun(run);
      toast.error("Não foi possível marcar a etapa.");
    }
  }

  return { run: visible ? run : null, elapsed, busy, act, dismiss, toggleStep };
}

function StepList({ run, onToggle }: { run: RunView; onToggle: (step: number) => void }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {run.steps.map((step, index) => {
        const checked = run.checks[index];
        const auto = run.autoChecks[index];
        return (
          <li key={step.title} className={cn("flex gap-2.5 rounded-xl p-2.5", checked ? "bg-success-tint" : "bg-surface-muted")}>
            <button
              type="button"
              onClick={() => onToggle(index)}
              disabled={auto}
              aria-pressed={checked}
              aria-label={auto ? `${step.title}: feito automaticamente` : checked ? `Desmarcar ${step.title}` : `Marcar ${step.title} como feito`}
              title={auto ? "Marcado automaticamente" : checked ? "Desmarcar" : "Já fiz esta etapa"}
              className="mt-0.5 grid size-7 flex-none place-items-center rounded-full hover:bg-surface disabled:cursor-default"
            >
              {checked ? <CheckCircle2 className="size-5 text-success" aria-hidden="true" /> : <Circle className="size-5 text-ink-muted" aria-hidden="true" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("m-0 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink", checked && "opacity-70")}>
                <span>
                  {step.title}
                  <span className="sr-only">{checked ? " (feito)" : " (a fazer)"}</span>
                </span>
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
              {step.check === "note" && !checked ? (
                <NoteButton compact className="mt-1.5" label="Anotar neste bloco" link={{ subject: run.subject, topic: run.topic || undefined, blockDay: run.day, blockKey: run.blockKey }} />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Controls({ run, busy, act, dismiss }: Pick<ReturnType<typeof usePanel>, "busy" | "act" | "dismiss"> & { run: RunView }) {
  if (run.status === "concluido") {
    return (
      <button type="button" onClick={dismiss} aria-label="Fechar o roteiro" className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink">
        <X className="size-4" aria-hidden="true" />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => act("pause")}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 text-xs font-medium text-on-brand hover:bg-brand-strong disabled:opacity-70"
      >
        <Pause className="size-3.5" aria-hidden="true" />
        {busy ? "Salvando" : "Pausar"}
      </button>
      <button
        type="button"
        onClick={() => act("discard")}
        disabled={busy}
        aria-label="Parar sem registrar o tempo"
        className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function Header({ run, elapsed }: { run: RunView; elapsed: number }) {
  // Etapa atual = a primeira ainda não feita (o aluno pode marcar fora de ordem).
  const pending = run.checks.findIndex((checked) => !checked);
  const current = pending < 0 ? run.steps.length : pending + 1;
  return (
    <div className="min-w-0">
      <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-ink-muted">
        {run.status === "concluido" ? (
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
        ) : (
          <span className="relative flex size-2.5 flex-shrink-0">
            {run.timerStartedAt ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" /> : null}
            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
          </span>
        )}
        {run.status === "concluido" ? "Bloco concluído" : pending < 0 ? "Todas as etapas feitas" : `Etapa ${current} de ${run.steps.length}`}
      </p>
      <p className="m-0 truncate text-[15px] font-bold text-ink">
        {run.subject}
        {run.topic ? <span className="font-medium text-ink-muted"> · {run.topic}</span> : null}
      </p>
      <p className="m-0 font-mono text-[13px] font-medium tabular-nums text-brand-strong">
        {formatClock(elapsed)} <span className="font-sans text-ink-muted">de {run.plannedMinutes} min</span>
      </p>
    </div>
  );
}

/** Painel lateral fixo do roteiro, no computador. Ocupa a própria coluna, então não cobre o conteúdo. */
export function StudyRunAside() {
  const { run, elapsed, busy, act, dismiss, toggleStep } = usePanel();
  if (!run) return null;
  return (
    <aside aria-label="Roteiro do bloco" className="hidden w-[340px] flex-none flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 lg:flex">
      <div className="flex items-start justify-between gap-3">
        <Header run={run} elapsed={elapsed} />
        <Controls run={run} busy={busy} act={act} dismiss={dismiss} />
      </div>
      {run.href ? (
        <Link href={run.href} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border-strong text-sm font-medium text-ink no-underline hover:bg-surface-muted">
          Abrir a atividade do bloco
        </Link>
      ) : null}
      <StepList run={run} onToggle={toggleStep} />
      {run.status === "concluido" ? (
        <OwlMascot mood="comemorando" size={96} message="Bloco concluído! +50 XP" className="self-center" />
      ) : null}
      {run.status === "concluido" ? (
        <Link href="/dashboard/fechar-dia" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand text-sm font-medium text-on-brand no-underline hover:bg-brand-strong">
          Fechar o dia com um resumo
        </Link>
      ) : null}
      <p className="m-0 text-xs leading-5 text-ink-muted">As etapas se marcam sozinhas quando o tempo passa, quando você termina a atividade, revisa os cartões ou escreve a anotação. Já fez alguma por conta própria? Toque no círculo para marcar.</p>
    </aside>
  );
}

/** Barra recolhível do roteiro, no celular. Fica no fluxo da página (embaixo do cabeçalho), sem cobrir nada. */
export function StudyRunBar() {
  const { run, elapsed, busy, act, dismiss, toggleStep } = usePanel();
  const pathname = usePathname();
  // Aberta só na página em que o aluno abriu: trocar de página recolhe a barra.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: (value: boolean) => boolean) => setOpenOn(next(open) ? pathname : null);
  if (!run) return null;
  const next = run.steps.find((_, index) => !run.checks[index]);
  return (
    <section aria-label="Roteiro do bloco" className="border-b border-border bg-surface px-4 py-2.5 lg:hidden">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <div className="min-w-0 flex-1">
            <Header run={run} elapsed={elapsed} />
            {next && !open ? <p className="m-0 truncate text-xs text-ink-muted">Agora: {next.title}</p> : null}
          </div>
          {open ? <ChevronUp className="size-5 flex-none text-ink-muted" aria-hidden="true" /> : <ChevronDown className="size-5 flex-none text-ink-muted" aria-hidden="true" />}
          <span className="sr-only">{open ? "Esconder o roteiro" : "Mostrar o roteiro"}</span>
        </button>
        <Controls run={run} busy={busy} act={act} dismiss={dismiss} />
      </div>
      {open ? (
        <div className="mt-3 flex max-h-[55dvh] flex-col gap-3 overflow-y-auto pb-1">
          {run.href ? (
            <Link href={run.href} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border-strong text-sm font-medium text-ink no-underline">
              Abrir a atividade do bloco
            </Link>
          ) : null}
          <StepList run={run} onToggle={toggleStep} />
        </div>
      ) : null}
    </section>
  );
}
