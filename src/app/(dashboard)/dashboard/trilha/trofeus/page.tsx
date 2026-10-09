import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Trophy } from "@/components/trail/trophy";
import { LockedPage } from "@/components/plan/locked-page";
import { allowanceFor } from "@/lib/plans";
import { getStudentOrRedirect } from "@/lib/server-user";
import { DAYS_PER_SECTION, getTrailForUser } from "@/lib/study-trail";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sala de troféus · Easy Education" };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function TrofeusPage() {
  const { user, access } = await getStudentOrRedirect();
  if (allowanceFor(access.tier, "trail").kind === "locked") {
    return (
      <LockedPage
        feature="trail"
        tier={access.tier}
        title="Sala de troféus"
        description="Os troféus fazem parte da trilha de estudos, disponível nos planos pagos."
      />
    );
  }
  const trail = await getTrailForUser(user.id);
  const earned = trail.trophies.filter((trophy) => trophy.earned > 0).length;
  const shelves = [trail.trophies.slice(0, 3), trail.trophies.slice(3, 6), trail.trophies.slice(6, 9)];

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <Link href="/dashboard/trilha" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a trilha
          </Link>
          <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink lg:text-4xl">Sala de troféus</h1>
          <p className="m-0 max-w-[620px] text-[15px] leading-6 text-ink-muted">
            Um troféu para cada seção da trilha. Feche os {DAYS_PER_SECTION} dias de uma seção para colocar o próximo na estante.
          </p>
        </div>
        <p className="m-0 text-[15px] text-ink-muted">
          <span className="text-[28px] font-extrabold text-brand">{earned}</span> de {trail.trophies.length} conquistados
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {shelves.map((shelf, row) => (
          <section key={row} aria-label={`Estante ${row + 1}`} className="relative">
            <div className="grid grid-cols-1 gap-8 px-4 sm:grid-cols-3 lg:px-16">
              {shelf.map((trophy) => {
                const locked = trophy.earned === 0;
                return (
                  <div key={trophy.section} className="flex flex-col items-center gap-3 text-center">
                    <div className="relative">
                      <Trophy tier={trophy.section - 1} locked={locked} size={150} />
                      {trophy.earned > 1 ? (
                        <span className="absolute -right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-extrabold text-on-brand">×{trophy.earned}</span>
                      ) : null}
                      {/* Pedestal */}
                      <div className="mx-auto -mt-1 h-3 w-44 rounded-full bg-border shadow-[0_5px_0_var(--surface-muted)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className={cn("m-0 text-lg font-bold", locked ? "text-ink-muted" : "text-ink")}>Troféu {trophy.name}</p>
                      <p className="m-0 text-[13px] text-ink-muted">
                        Seção {trophy.section} · {trophy.sectionTitle}
                      </p>
                      <p className="m-0 mt-1 text-xs font-medium text-ink-muted">
                        {locked ? `Conclua os níveis ${(trophy.section - 1) * DAYS_PER_SECTION + 1} a ${trophy.section * DAYS_PER_SECTION}` : `Conquistado em ${shortDate(trophy.firstEarnedAt!)}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
