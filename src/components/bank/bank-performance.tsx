import Link from "next/link";
import { ENEM_AREAS } from "@/lib/bank/constants";
import { resultHref } from "@/lib/bank/paths";
import { percent } from "@/lib/bank/estimate";
import { getPrisma } from "@/lib/prisma";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

/** Desempenho nos simulados de provas anteriores: acerto por matéria e evolução dos simulados (do diagnóstico em diante). */
export async function BankPerformance({ userId, dateWhere }: { userId: string; dateWhere?: { gte?: Date; lte?: Date } }) {
  const prisma = getPrisma();
  const [answers, sessions] = await Promise.all([
    prisma.bankAnswer.findMany({
      where: { userId, answeredAt: dateWhere },
      select: { isCorrect: true, timeMs: true, question: { select: { area: true, subject: { select: { name: true } } } } },
    }),
    prisma.bankSession.findMany({
      where: { userId, kind: { in: ["simulado", "diagnostic"] }, finishedAt: { not: null, ...(dateWhere ?? {}) } },
      orderBy: { startedAt: "asc" },
      take: 20,
      include: { answers: { select: { isCorrect: true } } },
    }),
  ]);

  // Sem simulado de prova anterior ainda: não ocupa espaço no painel (quem não estuda para o ENEM não vê).
  if (answers.length === 0 && sessions.length === 0) return null;

  const total = answers.length;
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const avgSeconds = total ? Math.round(answers.reduce((sum, answer) => sum + answer.timeMs, 0) / total / 1000) : 0;
  const bySubject = new Map<string, { total: number; correct: number }>();
  for (const answer of answers) {
    const name = answer.question.subject?.name ?? (answer.question.area ? ENEM_AREAS[answer.question.area] : null) ?? "Geral";
    const item = bySubject.get(name) ?? { total: 0, correct: 0 };
    item.total += 1;
    if (answer.isCorrect) item.correct += 1;
    bySubject.set(name, item);
  }
  const subjects = [...bySubject.entries()].map(([name, value]) => ({ name, ...value, accuracy: percent(value.correct, value.total) })).sort((a, b) => a.accuracy - b.accuracy);

  return (
    <section className="grid gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card lg:grid-cols-2">
      <div>
        <h2 className="m-0 text-xl font-bold text-ink">Provas anteriores do ENEM</h2>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          {total} respondidas · {percent(correct, total)}% de acerto · {avgSeconds}s por questão em média
        </p>
        <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
          {subjects.slice(0, 8).map((subject) => (
            <li key={subject.name} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-ink">{subject.name}</span>
                <span className="text-ink-muted">
                  {subject.accuracy}% ({subject.correct}/{subject.total})
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
                <div className={`h-full rounded-full ${subject.accuracy < 50 ? "bg-warning" : "bg-brand"}`} style={{ width: `${subject.accuracy}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="m-0 text-xl font-bold text-ink">Evolução nos simulados</h2>
        <p className="m-0 mt-1 text-sm text-ink-muted">Percentual de acerto em cada simulado, do diagnóstico (ponto de partida) em diante.</p>
        {sessions.length === 0 ? (
          <p className="m-0 mt-4 text-sm text-ink-muted">
            Faça o <Link href="/dashboard/simulados" className="font-semibold text-brand-strong underline underline-offset-2">simulado diagnóstico</Link> para marcar seu ponto de partida.
          </p>
        ) : (
          <ol className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
            {sessions.map((session) => {
              const totalQuestions = Array.isArray(session.questionIds) ? session.questionIds.length : 0;
              const hits = session.answers.filter((answer) => answer.isCorrect).length;
              const value = percent(hits, totalQuestions);
              return (
                <li key={session.id}>
                  <Link href={resultHref(session.id)} className="flex items-center gap-3 text-sm no-underline">
                    <span className="w-14 flex-none text-ink-muted">{dateFormat.format(session.startedAt)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-track" aria-hidden="true">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
                    </span>
                    <span className="w-24 flex-none text-right font-semibold text-ink">
                      {value}%{session.kind === "diagnostic" ? " · início" : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
