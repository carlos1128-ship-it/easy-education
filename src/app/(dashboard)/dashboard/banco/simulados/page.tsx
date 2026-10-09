import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { StartSessionButton } from "@/components/bank/start-session-button";
import { ENEM_AREAS } from "@/lib/bank/constants";
import { percent } from "@/lib/bank/estimate";
import { getSimuladoOptions } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Simulados de provas · Easy Education" };
export const dynamic = "force-dynamic";

/** Questões por área numa prova completa do ENEM (para avisar quando o banco ainda está parcial). */
const ENEM_PER_AREA = 45;

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function SimuladosBancoPage() {
  const { user } = await getStudentOrRedirect();
  const [options, sessions] = await Promise.all([
    getSimuladoOptions(user.id),
    getPrisma().bankSession.findMany({
      where: { userId: user.id, kind: { in: ["simulado", "diagnostic"] }, finishedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 12,
      include: { answers: { select: { isCorrect: true } } },
    }),
  ]);

  const byYear = new Map<string, { examSlug: string; examName: string; year: number; areas: Array<{ area: string | null; count: number }> }>();
  for (const option of options) {
    const key = `${option.examSlug}-${option.year}`;
    const entry = byYear.get(key) ?? { examSlug: option.examSlug, examName: option.examName, year: option.year, areas: [] };
    entry.areas.push({ area: option.area, count: option.count });
    byYear.set(key, entry);
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <Link href="/dashboard/banco" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Banco de questões
      </Link>
      <header>
        <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
          <ClipboardCheck className="size-4" aria-hidden="true" /> Simulados de provas anteriores
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Faça uma prova como ela foi</h1>
        <p className="m-0 mt-2 max-w-[660px] text-[15px] text-ink-muted">
          Questões originais, na ordem da prova, com cronômetro. O gabarito só aparece no resultado. A nota é uma <strong>estimativa baseada no seu desempenho</strong>, não a nota oficial.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="m-0 text-[15px] font-bold text-ink">Simulado diagnóstico</h2>
          <p className="m-0 mt-1 text-sm text-ink-muted">Poucas questões de cada área, para saber de onde você parte. Depois, os simulados seguintes mostram sua evolução.</p>
        </div>
        <StartSessionButton body={{ kind: "diagnostic", exam: "enem" }} disabled={options.length === 0}>
          Fazer o diagnóstico
        </StartSessionButton>
      </section>

      {byYear.size === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-ink-muted">O banco ainda não tem questões publicadas para simulados.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...byYear.values()]
            .sort((a, b) => b.year - a.year)
            .map((entry) => {
              const total = entry.areas.reduce((sum, item) => sum + item.count, 0);
              return (
                <section key={`${entry.examSlug}-${entry.year}`} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="m-0 text-lg font-bold text-ink">
                      {entry.examName} {entry.year}
                    </h2>
                    <span className="text-[13px] text-ink-muted">{total} questões disponíveis</span>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {entry.areas.map((item) => (
                      <li key={item.area ?? "geral"} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm">
                        <span className="text-ink">
                          {item.area ? (ENEM_AREAS[item.area] ?? item.area) : "Geral"}
                          <span className="ml-1.5 text-ink-muted">
                            ({item.count}
                            {item.count < ENEM_PER_AREA ? ` de ${ENEM_PER_AREA}: prova ainda parcial` : ""})
                          </span>
                        </span>
                        <StartSessionButton body={{ kind: "simulado", exam: entry.examSlug, year: entry.year, area: item.area ?? undefined }}>Começar</StartSessionButton>
                      </li>
                    ))}
                  </ul>
                  {entry.areas.length > 1 ? (
                    <StartSessionButton body={{ kind: "simulado", exam: entry.examSlug, year: entry.year }} className="border border-border-strong bg-surface text-ink hover:bg-surface-muted">
                      Todas as áreas juntas ({total} questões)
                    </StartSessionButton>
                  ) : null}
                </section>
              );
            })}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
        <h2 className="m-0 text-lg font-bold text-ink">Histórico e evolução</h2>
        {sessions.length === 0 ? (
          <p className="m-0 mt-2 text-sm text-ink-muted">Seus simulados concluídos aparecem aqui, do diagnóstico em diante, para você ver a evolução.</p>
        ) : (
          <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-border p-0">
            {sessions.map((session) => {
              const total = Array.isArray(session.questionIds) ? session.questionIds.length : 0;
              const correct = session.answers.filter((answer) => answer.isCorrect).length;
              return (
                <li key={session.id}>
                  <Link href={`/dashboard/banco/sessao/${session.id}/resultado`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm no-underline">
                    <span className="font-semibold text-ink">{session.title}</span>
                    {session.kind === "diagnostic" ? <span className="rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-strong">Ponto de partida</span> : null}
                    <span className="text-ink-muted">{dateFormat.format(session.startedAt)}</span>
                    <span className="ml-auto font-semibold text-ink">
                      {percent(correct, total)}% <span className="font-normal text-ink-muted">({correct}/{total})</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
