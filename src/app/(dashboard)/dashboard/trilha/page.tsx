import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Trophy as TrophyIcon } from "lucide-react";
import { StudyTrail } from "@/components/trail/study-trail";
import { Trophy } from "@/components/trail/trophy";
import { getCurrentUserOrRedirect } from "@/lib/server-user";
import { DAYS_PER_SECTION, SECTION_COUNT, getTrailForUser } from "@/lib/study-trail";

export const metadata: Metadata = { title: "Trilha de estudos · Easy Education" };

export default async function TrilhaPage() {
  const user = await getCurrentUserOrRedirect();
  const trail = await getTrailForUser(user.id);
  const today = trail.current;
  const earned = trail.trophies.filter((trophy) => trophy.earned > 0).length;
  const total = DAYS_PER_SECTION * SECTION_COUNT;

  return (
    <div className="mx-auto grid w-full max-w-[1680px] gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink lg:text-4xl">Trilha de estudos</h1>
          <p className="m-0 max-w-[620px] text-[15px] leading-6 text-ink-muted">
            Cada dia do seu plano concluído vale um nível. A cada 7 dias você fecha uma seção e ganha um troféu.
          </p>
        </header>
        <StudyTrail trail={trail} />
      </div>

      <aside className="flex flex-col gap-6 xl:sticky xl:top-0 xl:self-start">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
          <p className="m-0 text-[13px] font-medium text-ink-muted">{today ? "Hoje" : "Dia de hoje"}</p>
          <p className="m-0 mt-0.5 text-[17px] font-bold text-ink">{today ? today.title : "Concluído. Volte amanhã!"}</p>
          <p className="m-0 mt-1 text-[13px] leading-5 text-ink-muted">
            {today ? today.hint : "Você já passou de nível hoje. O próximo dia do plano libera o próximo nível."}
          </p>
          {today?.progress ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (today.progress.value / today.progress.target) * 100)}%` }} />
              </div>
              <p className="m-0 mt-1.5 text-xs font-medium text-brand-strong">{today.progress.label}</p>
            </div>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/plano"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong"
            >
              Ir para a etapa
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/trilha/trofeus"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-4 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted"
            >
              <TrophyIcon className="size-4" aria-hidden="true" />
              Sala de troféus
            </Link>
          </div>
        </div>

        <dl className="m-0 grid grid-cols-3 gap-4 px-1">
          <div className="flex flex-col">
            <dt className="order-2 text-[13px] font-medium text-ink-muted">de {total} níveis</dt>
            <dd className="order-1 m-0 text-[28px] font-extrabold leading-tight text-brand">{trail.doneCount}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="order-2 text-[13px] font-medium text-ink-muted">troféus</dt>
            <dd className="order-1 m-0 text-[28px] font-extrabold leading-tight text-brand">
              {earned}/{SECTION_COUNT}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="order-2 flex items-center gap-1 text-[13px] font-medium text-ink-muted">
              <Flame className="size-3.5 text-warning" aria-hidden="true" />
              dias seguidos
            </dt>
            <dd className="order-1 m-0 text-[28px] font-extrabold leading-tight text-brand">{trail.streak}</dd>
          </div>
        </dl>
        {trail.cycle > 1 ? <p className="m-0 px-1 text-[13px] text-ink-muted">Volta {trail.cycle} da trilha. Seus troféus das voltas anteriores continuam na sala.</p> : null}

        <Link href="/dashboard/trilha/trofeus" className="group flex flex-wrap items-end justify-center gap-1 rounded-2xl bg-surface-muted px-4 py-5 no-underline">
          {trail.trophies.map((trophy, index) => (
            <Trophy key={trophy.section} tier={index} locked={trophy.earned === 0} size={52} className="transition-transform group-hover:-translate-y-0.5" />
          ))}
          <span className="sr-only">Abrir a sala de troféus</span>
        </Link>
      </aside>
    </div>
  );
}
