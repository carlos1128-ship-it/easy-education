import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, FileText, ScrollText, Shuffle } from "lucide-react";
import { StartSessionButton } from "@/components/bank/start-session-button";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { OwlMascot, type OwlMood } from "@/components/mascot/owl-mascot";
import { PAST_EXAMS } from "@/lib/bank/constants";
import { examHref, PROVAS_HREF } from "@/lib/bank/paths";
import { FULL_EXAM_TIME_SEC, getExamDetail, isPastExam, PRACTICE_SIZE } from "@/lib/bank/past-exams";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ exam: string }> }): Promise<Metadata> {
  const { exam } = await params;
  return { title: `${isPastExam(exam) ? PAST_EXAMS[exam].name : "Provas"} · Provas anteriores · Easy Education` };
}

/** Coruja do painel da matéria: muda com o aproveitamento. */
function subjectOwl(accuracy: number | null): OwlMood {
  if (accuracy === null) return "estudante";
  if (accuracy >= 80) return "festa";
  if (accuracy >= 60) return "comemorando";
  return "determinada";
}

function hours(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default async function ExamPage({ params, searchParams }: { params: Promise<{ exam: string }>; searchParams: Promise<{ materia?: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { exam } = await params;
  if (!isPastExam(exam)) notFound();
  const { materia } = await searchParams;
  const detail = await getExamDetail(user.id, exam);
  if (!detail) notFound();
  const info = PAST_EXAMS[exam];

  const selected = detail.subjects.find((subject) => subject.slug === materia) ?? null;
  const accuracy = selected?.answered ? Math.round((selected.correct / selected.answered) * 100) : null;
  const totalAll = detail.subjects.reduce((sum, subject) => sum + subject.total, 0) + detail.unclassified;

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-6 pb-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Lateral: matérias do exame, como as unidades de um curso */}
      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-140px)] lg:self-start">
        <Link href={PROVAS_HREF} className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-[0.04em] text-ink-muted no-underline hover:text-ink">
          <ChevronLeft size={18} aria-hidden="true" /> Voltar
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-b-4 border-brand bg-surface p-3.5 shadow-card">
          <span className="grid size-11 flex-none place-items-center rounded-xl bg-brand text-on-brand"><ScrollText size={22} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="m-0 truncate text-base font-extrabold text-ink">{info.name}</p>
            <p className="m-0 text-xs text-ink-muted">{totalAll.toLocaleString("pt-BR")} questões oficiais</p>
          </div>
        </div>
        <p className="m-0 mt-2 px-1 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">Matérias</p>
        <nav aria-label={`Matérias de ${info.name}`} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          <Link
            href={examHref(exam)}
            aria-current={!selected ? "page" : undefined}
            className={cn("flex flex-none items-center gap-3 rounded-xl border-2 px-3 py-2.5 no-underline transition-colors", !selected ? "border-brand bg-brand-tint" : "border-transparent hover:bg-surface-muted")}
          >
            <SubjectIcon slug={null} className="size-9" size={18} />
            <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold text-ink">Todas as matérias</span>
          </Link>
          {detail.subjects.map((subject) => {
            const done = Math.round((subject.answered / Math.max(subject.total, 1)) * 100);
            const active = subject.slug === selected?.slug;
            return (
              <Link
                key={subject.slug}
                href={examHref(exam, subject.slug)}
                aria-current={active ? "page" : undefined}
                className={cn("flex w-[210px] flex-none items-center gap-3 rounded-xl border-2 px-3 py-2.5 no-underline transition-colors lg:w-auto", active ? "border-brand bg-brand-tint" : "border-transparent hover:bg-surface-muted")}
              >
                <SubjectIcon slug={subject.slug} className="size-9" size={18} />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
                    <span className="truncate">{subject.name}</span>
                    <span className="flex-none text-xs font-medium text-ink-muted">{subject.total}</span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                    <span className="block h-full rounded-full bg-success" style={{ width: `${done}%` }} />
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        {/* Painel da matéria escolhida */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-hero-panel p-5 shadow-card lg:p-8">
          <div className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <SubjectIcon slug={selected?.slug ?? null} className="size-12" size={24} />
                <div>
                  <p className="m-0 text-sm font-semibold text-brand-strong">{info.name} · {info.tagline}</p>
                  <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink lg:text-3xl">{selected?.name ?? "Todas as matérias"}</h1>
                </div>
              </div>
              <p className="m-0 max-w-[560px] text-[15px] text-ink-muted">
                {selected
                  ? `${selected.total} questões de ${selected.name} em provas da ${info.short}. ${selected.answered ? `Você já respondeu ${selected.answered} e acertou ${accuracy}%.` : "Você ainda não treinou esta matéria."}`
                  : `Treino com questões de todas as matérias da ${info.short}, misturadas como na prova.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <StartSessionButton
                  body={{ kind: "past", exam, subject: selected?.slug }}
                  busyLabel="Separando as questões…"
                  className="min-h-12 rounded-xl border-b-4 border-brand-strong bg-brand px-6 text-[15px] font-bold text-on-brand hover:brightness-110"
                >
                  Começar treino · {PRACTICE_SIZE} questões
                </StartSessionButton>
                {selected ? (
                  <StartSessionButton
                    body={{ kind: "past", exam }}
                    busyLabel="Separando…"
                    className="min-h-12 rounded-xl border-2 border-b-4 border-border-strong bg-surface px-5 text-[15px] font-bold text-ink hover:bg-surface-muted"
                  >
                    <Shuffle size={16} className="mr-2" aria-hidden="true" /> Misturar matérias
                  </StartSessionButton>
                ) : null}
              </div>
            </div>
            <OwlMascot mood={subjectOwl(accuracy)} size={170} priority className="flex-none self-center" />
          </div>
        </section>

        {/* Provas completas por edição */}
        {detail.editions.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="provas-completas">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="provas-completas" className="m-0 text-xl font-extrabold text-ink">Provas completas</h2>
                <p className="m-0 text-sm text-ink-muted">A prova da edição inteira, na ordem original, com cronômetro de {hours(FULL_EXAM_TIME_SEC[exam] ?? 0)}. O gabarito aparece no fim.</p>
              </div>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 2xl:grid-cols-3">
              {detail.editions.map((edition) => (
                <li key={`${edition.year}-${edition.edition}`} className="flex items-center gap-3 rounded-2xl border-2 border-b-4 border-border bg-surface p-4">
                  <span className="grid size-11 flex-none place-items-center rounded-xl bg-surface-muted text-ink-muted"><FileText size={20} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-bold text-ink">
                      {info.short} {edition.year}
                      {edition.edition ? <span className="font-medium text-ink-muted"> · {edition.edition}</span> : null}
                    </p>
                    <p className="m-0 flex items-center gap-1 text-xs text-ink-muted">
                      <Clock size={12} aria-hidden="true" /> {edition.total} questões{edition.answered ? ` · ${edition.answered} já respondidas` : ""}
                    </p>
                  </div>
                  <StartSessionButton
                    body={{ kind: "past", exam, year: edition.year, edition: edition.edition }}
                    className="min-h-10 rounded-xl border-2 border-brand px-3.5 text-sm font-bold text-brand-strong hover:bg-brand-tint"
                  >
                    Fazer
                  </StartSessionButton>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
