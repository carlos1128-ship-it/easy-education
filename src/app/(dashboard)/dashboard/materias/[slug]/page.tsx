import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { StartSessionButton } from "@/components/bank/start-session-button";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { getSubjectTree, progressPct } from "@/lib/bank/tree";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Matéria · Easy Education" };
export const dynamic = "force-dynamic";

function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <span className={cn("h-2 flex-1 overflow-hidden rounded-full bg-track", className)} aria-hidden="true">
      <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
    </span>
  );
}

export default async function MateriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { slug } = await params;
  const tree = await getSubjectTree(user.id, slug);
  if (!tree) notFound();
  const { subject, units } = tree;
  // Abre a primeira unidade que ainda não foi concluída (ou a primeira).
  const openIndex = Math.max(0, units.findIndex((unit) => unit.questions > 0 && unit.answered < unit.questions));

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-5">
      <Link href="/dashboard/materias" className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted no-underline hover:text-ink">
        <ChevronLeft size={16} aria-hidden="true" /> Matérias
      </Link>

      <header className="flex items-center gap-4 rounded-2xl border-2 border-b-4 border-brand bg-surface p-4 shadow-card">
        <SubjectIcon slug={subject.slug} className="size-14" size={28} />
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-ink">{subject.name}</h1>
          <p className="m-0 mt-0.5 text-sm text-ink-muted">
            {units.length} {units.length === 1 ? "unidade" : "unidades"} · {units.reduce((sum, unit) => sum + unit.questions, 0).toLocaleString("pt-BR")} questões de provas oficiais
          </p>
        </div>
      </header>

      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-muted">Unidades</p>

      <div className="flex flex-col gap-3">
        {units.map((unit, index) => {
          const pct = progressPct(unit.answered, unit.questions);
          return (
            <details key={unit.id} open={index === openIndex} className="group rounded-2xl border border-border border-b-4 bg-surface shadow-card open:border-brand">
              <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span className="text-[16px] font-bold text-ink group-open:text-brand-strong">{unit.name}</span>
                  <ChevronDown size={18} className="flex-none text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </span>
                <span className="flex items-center gap-3">
                  <Bar pct={pct} />
                  <span className="w-10 text-right text-xs font-semibold text-ink-muted">{pct}%</span>
                </span>
              </summary>

              <ul className="m-0 list-none border-t border-border p-0">
                {unit.topics.map((topic) => {
                  const ready = topic.questions > 0 && topic.examSlug;
                  return (
                    <li key={topic.id} className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[15px] font-medium text-ink">{topic.name}</p>
                        <p className="m-0 text-xs text-ink-muted">
                          {topic.questions ? `${topic.questions} ${topic.questions === 1 ? "questão" : "questões"}` : "Questões em preparação"}
                          {topic.answered ? ` · você respondeu ${Math.min(topic.answered, topic.questions)} (${progressPct(topic.correct, topic.answered)}% de acerto)` : ""}
                        </p>
                      </div>
                      {ready ? (
                        <StartSessionButton
                          body={{ kind: "past", exam: topic.examSlug as string, subject: subject.slug, topic: topic.id }}
                          className="min-h-9 flex-none bg-brand-tint px-4 text-brand-strong hover:bg-brand-soft"
                        >
                          {topic.answered ? "Continuar" : "Praticar"}
                        </StartSessionButton>
                      ) : (
                        <span className="flex-none rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-muted">Em breve</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
