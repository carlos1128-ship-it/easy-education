import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { StartSessionButton } from "@/components/bank/start-session-button";
import { EmptyState } from "@/components/ui/empty-state";
import { examHref } from "@/lib/bank/paths";
import examCovers from "@/lib/bank/exam-covers.json";
import { fullExamTimeSec, getExamBooklets, type Booklet } from "@/lib/bank/past-exams";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Provas anteriores · Easy Education" };
export const dynamic = "force-dynamic";

/** Cor de cada exame (capa do caderno e selo da lista). */
const EXAM_TONE: Record<string, { badge: string; cover: string; coverAlt: string }> = {
  enem: { badge: "bg-[#2563eb] text-white", cover: "from-[#38bdf8] to-[#0ea5e9]", coverAlt: "from-[#fde68a] to-[#facc15]" },
  fuvest: { badge: "bg-[#1e3a8a] text-white", cover: "from-[#93c5fd] to-[#3b82f6]", coverAlt: "from-[#93c5fd] to-[#3b82f6]" },
  unicamp: { badge: "bg-[#b91c1c] text-white", cover: "from-[#fca5a5] to-[#ef4444]", coverAlt: "from-[#fca5a5] to-[#ef4444]" },
  unesp: { badge: "bg-[#0f766e] text-white", cover: "from-[#5eead4] to-[#14b8a6]", coverAlt: "from-[#5eead4] to-[#14b8a6]" },
  etec: { badge: "bg-[#9f1239] text-white", cover: "from-[#fda4af] to-[#e11d48]", coverAlt: "from-[#fecdd3] to-[#fb7185]" },
  fatec: { badge: "bg-[#7c2d12] text-white", cover: "from-[#fdba74] to-[#ea580c]", coverAlt: "from-[#fed7aa] to-[#fb923c]" },
};
const DEFAULT_TONE = { badge: "bg-brand text-on-brand", cover: "from-brand-soft to-brand", coverAlt: "from-brand-soft to-brand" };

function hours(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/**
 * Capas oficiais (1ª página do caderno, só reduzida), geradas por scripts/bank/enem-official.ts. Hoje só o ENEM,
 * cuja licença (INEP, CC BY-ND) permite reproduzir com crédito. Chave: "exame|ano|edição|dia".
 */
const OFFICIAL_COVERS = examCovers as Record<string, { cover: string; source: string }>;

/** Capa do caderno: a oficial quando há (com o crédito); senão, uma desenhada com exame, ano e dia. */
function Cover({ exam, booklet }: { exam: { slug: string; short: string }; booklet: Booklet }) {
  const official = OFFICIAL_COVERS[`${exam.slug}|${booklet.year}|${booklet.edition}|${booklet.day ?? ""}`];
  if (official) {
    return (
      <figure className="m-0 flex w-[84px] flex-none flex-col gap-0.5">
        <a href={official.source} target="_blank" rel="noopener noreferrer" title="Abrir o caderno oficial (INEP)" className="block overflow-hidden rounded-md shadow-md ring-1 ring-black/10">
          <Image src={official.cover} alt={`Capa do caderno oficial do ${exam.short} ${booklet.year}${booklet.day ? `, ${booklet.day}º dia` : ""}`} width={84} height={119} className="block h-auto w-full" />
        </a>
        <figcaption className="text-center text-[10px] text-ink-muted">Capa: INEP</figcaption>
      </figure>
    );
  }
  const tone = EXAM_TONE[exam.slug] ?? DEFAULT_TONE;
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] w-[84px] flex-none flex-col overflow-hidden rounded-md bg-gradient-to-b p-1.5 shadow-md ring-1 ring-black/10",
        booklet.day === 2 ? tone.coverAlt : tone.cover,
      )}
      aria-hidden="true"
    >
      <span className="rounded-sm bg-white/90 px-1 py-0.5 text-[9px] font-extrabold leading-none text-slate-800">
        {exam.short} <span className="font-medium text-slate-500">{booklet.year}</span>
      </span>
      <span className="mt-1.5 flex flex-col gap-1">
        {[100, 85, 92, 70, 88, 60].map((width, index) => (
          <span key={index} className="h-[3px] rounded-full bg-white/70" style={{ width: `${width}%` }} />
        ))}
      </span>
      <span className="mt-auto self-end rounded-sm bg-white/90 px-1 text-[10px] font-black leading-tight text-slate-800">
        {booklet.day ?? (booklet.edition.match(/\d/)?.[0] ?? "1")}
      </span>
    </div>
  );
}

export default async function ProvasPage({ searchParams }: { searchParams: Promise<{ exame?: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { exame } = await searchParams;
  const exams = await getExamBooklets(user.id);
  const selected = exams.find((exam) => exam.slug === exame) ?? exams[0];

  if (!selected) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <EmptyState icon={CalendarDays} title="Ainda não há provas publicadas." description="Assim que as provas anteriores forem importadas, elas aparecem aqui por exame e ano." />
      </div>
    );
  }

  const bookletCount = selected.years.reduce((sum, year) => sum + year.booklets.length, 0);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-5 pb-10 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Exames: lista à esquerda no computador, faixa rolável no celular */}
      <aside className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-card lg:sticky lg:top-0 lg:max-h-[calc(100dvh-120px)] lg:self-start lg:p-4">
        <p className="m-0 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-muted">Exames</p>
        <nav aria-label="Exames" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
          {exams.map((exam) => {
            const active = exam.slug === selected.slug;
            const tone = EXAM_TONE[exam.slug] ?? DEFAULT_TONE;
            return (
              <Link
                key={exam.slug}
                href={`/dashboard/provas?exame=${exam.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[170px] flex-none items-center gap-3 rounded-xl border-2 border-b-4 px-3 py-2.5 no-underline transition-colors lg:min-w-0",
                  active ? "border-brand bg-brand-tint" : "border-border bg-background hover:border-border-strong",
                )}
              >
                <span className={cn("grid size-9 flex-none place-items-center rounded-lg text-[10px] font-black tracking-tight", tone.badge)}>{exam.short.slice(0, 5)}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[15px] font-bold", active ? "text-brand-strong" : "text-ink")}>{exam.short}</span>
                  <span className="block text-xs text-ink-muted">
                    {exam.years.length} {exam.years.length === 1 ? "ano" : "anos"} · {exam.total.toLocaleString("pt-BR")} questões
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="flex min-w-0 flex-col gap-6" aria-labelledby="provas-titulo">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="m-0 text-sm font-semibold text-brand-strong">{selected.name} · {selected.tagline}</p>
            <h1 id="provas-titulo" className="m-0 mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {bookletCount} {bookletCount === 1 ? "prova anterior" : "provas anteriores"}
            </h1>
          </div>
          <Link
            href={examHref(selected.slug)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-b-4 border-border-strong bg-surface px-4 text-sm font-bold text-ink no-underline hover:bg-surface-muted"
          >
            Treinar por matéria <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </header>

        {selected.years.map(({ year, booklets }) => (
          <section key={year} className="flex flex-col gap-3 border-b border-border pb-6 last:border-b-0" aria-labelledby={`ano-${year}`}>
            <h2 id={`ano-${year}`} className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
              <CalendarDays size={20} className="text-ink-muted" aria-hidden="true" /> {year}
            </h2>
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
              {booklets.map((booklet) => {
                const done = booklet.answered >= booklet.total;
                const time = hours(fullExamTimeSec(selected.slug, booklet.day ?? undefined, booklet.year));
                return (
                  <li key={`${booklet.edition}-${booklet.day ?? 0}`} className="flex gap-4 rounded-2xl border border-border bg-surface p-3 shadow-card">
                    <Cover exam={selected} booklet={booklet} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className="m-0 text-[15px] font-bold leading-snug text-ink">{booklet.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {booklet.tag ? (
                          <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", booklet.day === 2 ? "bg-success-tint text-success" : "bg-brand-tint text-brand-strong")}>{booklet.tag}</span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                          <Clock size={12} aria-hidden="true" /> {booklet.total} questões{time ? ` · ${time}` : ""}
                        </span>
                      </div>
                      {booklet.answered ? (
                        <p className="m-0 text-xs font-medium text-ink-muted">{done ? "Você já fez esta prova" : `Você respondeu ${booklet.answered} de ${booklet.total}`}</p>
                      ) : null}
                      <div className="mt-auto">
                        <StartSessionButton
                          body={{ kind: "past", exam: selected.slug, year: booklet.year, edition: booklet.edition, ...(booklet.day ? { day: booklet.day } : {}) }}
                          busyLabel="Abrindo a prova..."
                          className="min-h-9 rounded-lg px-0 text-sm font-bold text-brand-strong hover:underline"
                        >
                          {done ? "Refazer prova" : "Fazer prova"}
                        </StartSessionButton>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}
