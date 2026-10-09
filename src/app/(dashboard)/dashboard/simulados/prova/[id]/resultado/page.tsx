import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { QuestionTools } from "@/components/bank/question-tools";
import { ENEM_AREAS } from "@/lib/bank/constants";
import { ESTIMATE_DISCLAIMER } from "@/lib/bank/estimate";
import { getBookmarkedIds, getSessionForUser, computeResult } from "@/lib/bank/service";
import { sourceLabel } from "@/lib/bank/labels";
import { sessionHref, SIMULADOS_HREF } from "@/lib/bank/paths";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resultado · Easy Education" };
export const dynamic = "force-dynamic";

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
      <div className={cn("h-full rounded-full", value >= 70 ? "bg-success" : value >= 40 ? "bg-brand" : "bg-danger")} style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(1, m)} min`;
}

export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { id } = await params;
  const loaded = await getSessionForUser(user.id, id);
  if (!loaded) notFound();
  const { session, questions } = loaded;
  if (!session.finishedAt) redirect(sessionHref(id));

  const durationSec = Math.max(1, Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 1000));
  const result = computeResult(questions, session.answers, durationSec);
  const bookmarked = await getBookmarkedIds(user.id, questions.map((question) => question.id));
  const answerBy = new Map(result.items.map((item) => [item.questionId, item]));
  const showEstimate = session.kind !== "practice" && result.overallEstimate && session.exam?.slug === "enem";
  // Matérias só aparecem para as questões já classificadas; as demais contam na área.
  const subjects = result.bySubject.filter((item) => item.name !== "Sem matéria");

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <header>
        <p className="m-0 text-sm font-medium text-brand-strong">{session.kind === "diagnostic" ? "Simulado diagnóstico" : session.kind === "simulado" ? "Simulado" : "Prática"}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{session.title}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <p className="m-0 text-[32px] font-extrabold leading-none text-brand">{result.accuracy}%</p>
          <p className="m-0 mt-1 text-[13px] font-medium text-ink-muted">de acerto ({result.correct} de {result.total})</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <p className="m-0 text-[32px] font-extrabold leading-none text-brand">{result.answered}</p>
          <p className="m-0 mt-1 text-[13px] font-medium text-ink-muted">respondidas{result.total - result.answered > 0 ? ` (${result.total - result.answered} em branco contam como erro)` : ""}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <p className="m-0 flex items-center gap-2 text-[32px] font-extrabold leading-none text-brand">
            <Clock className="size-6" aria-hidden="true" />
            {formatDuration(result.durationSec)}
          </p>
          <p className="m-0 mt-1 text-[13px] font-medium text-ink-muted">de tempo total</p>
        </div>
      </section>

      {showEstimate && result.overallEstimate ? (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="m-0 text-lg font-bold text-ink">Nota estimada</h2>
          <p className="m-0 mt-2 text-[28px] font-extrabold text-brand">
            {result.overallEstimate.low} a {result.overallEstimate.high}
          </p>
          <p className="m-0 mt-1 text-sm text-ink-muted">{ESTIMATE_DISCLAIMER}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="m-0 text-lg font-bold text-ink">Resultado por área</h2>
        <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
          {result.byArea.map((area) => (
            <li key={area.area} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold text-ink">{area.name}</span>
                <span className="text-ink-muted">
                  <strong className="text-ink">{area.correct}</strong> acertos e <strong className="text-ink">{area.total - area.correct}</strong> erros de {area.total} · {area.accuracy}%
                  {showEstimate && area.estimate ? ` · estimativa ${area.estimate.low}–${area.estimate.high}` : ""}
                </span>
              </div>
              <ScoreBar value={area.accuracy} />
            </li>
          ))}
        </ul>
      </section>

      {subjects.length ? (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="m-0 text-lg font-bold text-ink">Resultado por matéria</h2>
          <p className="m-0 mt-1 text-sm text-ink-muted">Da que você mais errou para a que mais acertou. Comece a revisar pelas primeiras.</p>
          <ul className="m-0 mt-4 grid list-none gap-x-8 gap-y-4 p-0 md:grid-cols-2">
            {subjects.map((item) => (
              <li key={item.name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{item.name}</span>
                  <span className="text-ink-muted">
                    {item.correct} de {item.total} · {item.accuracy}%
                  </span>
                </div>
                <ScoreBar value={item.accuracy} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Questão por questão</h2>
        {questions.map((question, position) => {
          const item = answerBy.get(question.id);
          const options = Array.isArray(question.options) ? (question.options as Array<{ label: string; text: string }>) : [];
          return (
            <details key={question.id} className="group rounded-2xl border border-border bg-surface p-4 shadow-card">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-ink">{position + 1}.</span>
                <span className="text-ink">{sourceLabel(question)}</span>
                <span className="text-ink-muted">· {question.subject?.name ?? (question.area ? ENEM_AREAS[question.area] : null) ?? "Geral"}</span>
                <span className={cn("ml-auto inline-flex items-center gap-1 font-semibold", item?.isCorrect ? "text-success" : "text-danger")}>
                  {item?.isCorrect ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
                  {item?.selected ? `Você marcou ${item.selected}` : "Em branco"} · correta: {question.correctLabel}
                </span>
              </summary>
              <div className="mt-4 flex flex-col gap-3 text-[15px] leading-7">
                {question.statement ? <p className="m-0 font-medium text-ink">{question.statement}</p> : null}
                <ol className="m-0 flex list-none flex-col gap-1 p-0 text-ink-muted">
                  {options.map((option) => (
                    <li key={option.label} className={cn(option.label === question.correctLabel && "font-semibold text-success", option.label === item?.selected && option.label !== question.correctLabel && "font-semibold text-danger")}>
                      {option.label}) {option.text || "(imagem)"}
                    </li>
                  ))}
                </ol>
                {question.explanation ? (
                  <div>
                    <p className="m-0 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">Resolução comentada</p>
                    <p className="m-0 mt-1 whitespace-pre-line text-ink">{question.explanation}</p>
                  </div>
                ) : null}
                <QuestionTools questionId={question.id} bookmarked={bookmarked.has(question.id)} />
              </div>
            </details>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/revisao" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong">
          <RotateCcw className="size-4" aria-hidden="true" /> Revisar o que errei
        </Link>
        <Link href={SIMULADOS_HREF} className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
          Voltar aos simulados
        </Link>
        <Link href="/dashboard/desempenho" className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
          Ver minha evolução
        </Link>
      </div>
    </div>
  );
}
