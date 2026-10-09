import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { QuestionTools } from "@/components/bank/question-tools";
import { ESTIMATE_DISCLAIMER } from "@/lib/bank/estimate";
import { getBookmarkedIds, getSessionForUser, computeResult } from "@/lib/bank/service";
import { sourceLabel } from "@/lib/bank/labels";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resultado · Easy Education" };
export const dynamic = "force-dynamic";

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
  if (!session.finishedAt) redirect(`/dashboard/banco/sessao/${id}`);

  const durationSec = Math.max(1, Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 1000));
  const result = computeResult(questions, session.answers, durationSec);
  const bookmarked = await getBookmarkedIds(user.id, questions.map((question) => question.id));
  const answerBy = new Map(result.items.map((item) => [item.questionId, item]));
  const showEstimate = session.kind !== "practice" && result.overallEstimate && session.exam?.slug === "enem";
  const weakest = result.bySubject.filter((item) => item.total >= 1 && item.accuracy < 70).slice(0, 4);

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
          <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
            {result.byArea.map((area) => (
              <li key={area.area} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <span className="text-ink">{area.name}</span>
                <span className="font-semibold text-ink">
                  {area.estimate ? `${area.estimate.low}–${area.estimate.high}` : "—"} <span className="font-normal text-ink-muted">({area.correct}/{area.total})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : result.byArea.length > 1 ? (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="m-0 text-lg font-bold text-ink">Acerto por área</h2>
          <ul className="m-0 mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
            {result.byArea.map((area) => (
              <li key={area.area} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm">
                <span className="text-ink">{area.name}</span>
                <span className="font-semibold text-ink">{area.accuracy}% <span className="font-normal text-ink-muted">({area.correct}/{area.total})</span></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {weakest.length ? (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="m-0 text-lg font-bold text-ink">O que revisar primeiro</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 text-sm text-ink">
            {weakest.map((item) => (
              <li key={item.name} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="text-ink-muted">{item.accuracy}% de acerto ({item.correct}/{item.total})</span>
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
                <span className="text-ink-muted">· {question.subject?.name ?? "Sem matéria"}</span>
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
        <Link href="/dashboard/banco" className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
          Voltar ao banco
        </Link>
        <Link href="/dashboard/desempenho" className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
          Ver minha evolução
        </Link>
      </div>
    </div>
  );
}
