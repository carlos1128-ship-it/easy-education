import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { getSubjectSummaries, progressPct } from "@/lib/bank/tree";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Matérias · Easy Education" };
export const dynamic = "force-dynamic";

export default async function MateriasPage() {
  const { user } = await getStudentOrRedirect();
  const subjects = await getSubjectSummaries(user.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <header>
        <p className="m-0 text-sm font-medium text-brand-strong">Estudar por matéria</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Matérias</h1>
        <p className="m-0 mt-2 max-w-[680px] text-[15px] text-ink-muted">
          Escolha a matéria, a unidade e o assunto. O treino abre na hora com questões que já caíram no ENEM, com o gabarito oficial.
        </p>
      </header>

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => {
          const pct = progressPct(subject.answered, subject.questions);
          return (
            <li key={subject.slug}>
              <Link
                href={`/dashboard/materias/${subject.slug}`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-border border-b-4 bg-surface p-4 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand"
              >
                <SubjectIcon slug={subject.slug} className="size-12" size={24} />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-[16px] font-bold text-ink">{subject.name}</span>
                  <span className="text-xs text-ink-muted">
                    {subject.units} {subject.units === 1 ? "unidade" : "unidades"} · {subject.questions.toLocaleString("pt-BR")} questões
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track" aria-hidden="true">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
                    </span>
                    <span className="text-xs font-medium text-ink-muted">{pct}%</span>
                  </span>
                </span>
                <ArrowRight size={18} className="flex-none text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-strong" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
