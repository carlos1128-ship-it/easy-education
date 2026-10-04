import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Flame } from "lucide-react";
import { StudyTrail } from "@/components/trail/study-trail";
import { getCurrentUserOrRedirect } from "@/lib/server-user";
import { getTrailForUser } from "@/lib/study-trail";

export const metadata: Metadata = { title: "Trilha de estudos · Easy Education" };

export default async function TrilhaPage() {
  const user = await getCurrentUserOrRedirect();
  const trail = await getTrailForUser(user.id);
  const next = trail.current;

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink lg:text-4xl">Trilha de estudos</h1>
          <p className="m-0 max-w-[560px] text-[15px] leading-6 text-ink-muted">
            Cada etapa libera a próxima. Para subir, é preciso acertar, revisar e estudar todo dia.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-ink">
            <Flame className="size-4 text-warning" aria-hidden="true" />
            {trail.streak} {trail.streak === 1 ? "dia seguido" : "dias seguidos"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-ink">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            {trail.doneCount} {trail.doneCount === 1 ? "etapa concluída" : "etapas concluídas"}
          </span>
        </div>
      </header>

      {next ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-medium text-ink-muted">Próxima etapa</p>
            <p className="m-0 text-[17px] font-bold text-ink">{next.title}</p>
            {next.progress ? <p className="m-0 text-[13px] text-brand-strong">{next.progress.label}</p> : null}
          </div>
          {next.kind !== "trofeu" ? (
            <Link
              href={next.href}
              className="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong"
            >
              Ir para a etapa
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ) : null}

      <StudyTrail trail={trail} />
    </div>
  );
}
