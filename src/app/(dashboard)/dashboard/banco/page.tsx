import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Library, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { PracticeLauncher } from "@/components/bank/practice-launcher";
import { ANSWER_FILTERS, ANSWER_FILTER_LABEL, DIFFICULTIES, DIFFICULTY_LABEL } from "@/lib/bank/constants";
import { sourceLabel } from "@/lib/bank/labels";
import { PAGE_SIZE, getFilterOptions, listQuestions, parseFilters } from "@/lib/bank/service";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Banco de questões · Easy Education" };
export const dynamic = "force-dynamic";

const selectClass = "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] text-ink";

type SearchParams = Record<string, string | string[] | undefined>;

function Field({ label, name, value, children }: { label: string; name: string; value?: string | number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="text-[13px] font-medium text-ink-muted">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className={selectClass}>
        {children}
      </select>
    </div>
  );
}

function pageHref(params: SearchParams, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single && key !== "pagina") search.set(key, single);
  }
  if (page > 1) search.set("pagina", String(page));
  const query = search.toString();
  return `/dashboard/banco${query ? `?${query}` : ""}`;
}

export default async function BancoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { user } = await getStudentOrRedirect();
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = Math.max(1, Number(Array.isArray(params.pagina) ? params.pagina[0] : params.pagina) || 1);
  const [options, { total, rows }] = await Promise.all([getFilterOptions(user.id), listQuestions(user.id, filters, page)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const topics = options.subjects.find((subject) => subject.slug === filters.subject)?.topics ?? [];

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
            <Library className="size-4" aria-hidden="true" /> Banco de questões
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Questões de provas anteriores</h1>
          <p className="m-0 mt-2 max-w-[640px] text-[15px] text-ink-muted">
            Responda sem baixar nada, com gabarito e resolução comentada. Sem custo de IA, em todos os planos. Cada questão mostra a prova, o ano e a fonte.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/banco/simulados" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
            <ClipboardCheck className="size-4" aria-hidden="true" /> Simulados de provas
          </Link>
          <Link href="/dashboard/revisao" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
            <RotateCcw className="size-4" aria-hidden="true" /> Revisão
          </Link>
          <Link href="/dashboard/banco/gerar" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-4 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
            <Sparkles className="size-4" aria-hidden="true" /> Gerar questão com IA
          </Link>
        </div>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" aria-label="Filtros">
        <Field label="Exame" name="exame" value={filters.exam}>
          <option value="">Todos</option>
          {options.exams.map((exam) => (
            <option key={exam.slug} value={exam.slug}>
              {exam.name}
            </option>
          ))}
        </Field>
        <Field label="Ano" name="ano" value={filters.year}>
          <option value="">Todos</option>
          {options.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Field>
        <Field label="Área" name="area" value={filters.area}>
          <option value="">Todas</option>
          {options.areas.map((area) => (
            <option key={area.slug} value={area.slug}>
              {area.name}
            </option>
          ))}
        </Field>
        <Field label="Matéria" name="materia" value={filters.subject}>
          <option value="">Todas</option>
          {options.subjects.map((subject) => (
            <option key={subject.slug} value={subject.slug}>
              {subject.name}
            </option>
          ))}
        </Field>
        <Field label="Assunto" name="assunto" value={filters.topic}>
          <option value="">{filters.subject ? "Todos" : "Escolha a matéria"}</option>
          {topics.map((topic) => (
            <option key={topic.slug} value={topic.slug}>
              {topic.name}
            </option>
          ))}
        </Field>
        <Field label="Dificuldade" name="dificuldade" value={filters.difficulty}>
          <option value="">Todas</option>
          {DIFFICULTIES.map((item) => (
            <option key={item} value={item}>
              {DIFFICULTY_LABEL[item]}
            </option>
          ))}
        </Field>
        <Field label="Meu histórico" name="status" value={filters.status}>
          {ANSWER_FILTERS.map((item) => (
            <option key={item} value={item === "todas" ? "" : item}>
              {ANSWER_FILTER_LABEL[item]}
            </option>
          ))}
        </Field>
        <div className="flex items-end gap-2">
          <button type="submit" className="h-11 flex-1 rounded-lg bg-brand px-4 text-[15px] font-medium text-on-brand hover:bg-brand-strong">
            Filtrar
          </button>
          <Link href="/dashboard/banco" className="grid h-11 place-items-center rounded-lg border border-border-strong px-3 text-sm text-ink no-underline hover:bg-surface-muted">
            Limpar
          </Link>
        </div>
      </form>

      <PracticeLauncher
        available={total}
        filters={{ exam: filters.exam, year: filters.year, area: filters.area, subject: filters.subject, topic: filters.topic, difficulty: filters.difficulty, status: filters.status }}
      />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-ink-muted">
          Nenhuma questão com esses filtros. Tente outros ou clique em &ldquo;Limpar&rdquo;.
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((row) => {
            const last = row.answers[0];
            const preview = (row.statement || row.supportText || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "[imagem]").replace(/\s+/g, " ").slice(0, 190);
            return (
              <li key={row.id}>
                <Link href={`/dashboard/banco/questao/${row.id}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 no-underline shadow-card transition-colors hover:border-border-strong">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="font-bold text-ink">{sourceLabel(row)}</span>
                    {row.subject ? <span className="text-ink-muted">· {row.subject.name}</span> : null}
                    {row.topic ? <span className="text-ink-muted">· {row.topic.name}</span> : null}
                    {row.difficulty ? <span className="text-ink-muted">· {DIFFICULTY_LABEL[row.difficulty as keyof typeof DIFFICULTY_LABEL] ?? row.difficulty}</span> : null}
                    <span className={cn("ml-auto inline-flex items-center gap-1 font-medium", last ? (last.isCorrect ? "text-success" : "text-danger") : "text-ink-muted")}>
                      {last ? last.isCorrect ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" /> : null}
                      {last ? (last.isCorrect ? "Acertou" : "Errou") : "Não respondida"}
                    </span>
                  </div>
                  <p className="m-0 text-[15px] leading-6 text-ink-muted">{preview}{preview.length >= 190 ? "…" : ""}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-between gap-3" aria-label="Páginas">
          {page > 1 ? (
            <Link href={pageHref(params, page - 1)} className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-ink no-underline hover:bg-surface-muted">
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={pageHref(params, page + 1)} className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-ink no-underline hover:bg-surface-muted">
              Próxima →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
