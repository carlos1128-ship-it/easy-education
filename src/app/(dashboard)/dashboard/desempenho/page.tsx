import { AlertTriangle } from "lucide-react";
import { EssayLineChart, SubjectBarChart, SubjectEvolutionChart, WeeklyHoursChart } from "@/components/charts/performance-charts";
import { dayKey, shortDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

function lastWeeks() {
  return Array.from({ length: 8 }).map((_, index) => {
    const end = new Date();
    end.setDate(end.getDate() - (7 - index) * 7);
    return end;
  });
}

function parseDateParam(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function DesempenhoPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { from, to } = await searchParams;
  const startDate = parseDateParam(from);
  const endDate = parseDateParam(to);
  if (endDate) endDate.setHours(23, 59, 59, 999);
  const dateWhere = startDate || endDate ? { gte: startDate ?? undefined, lte: endDate ?? undefined } : undefined;
  const prisma = getPrisma();
  const [sessions, quizzes, essays, incorrectQuestions] = await Promise.all([
    prisma.studySession.findMany({ where: { userId: user.id, date: dateWhere }, orderBy: { date: "asc" } }),
    prisma.quiz.findMany({ where: { userId: user.id, score: { not: null }, createdAt: dateWhere }, orderBy: { createdAt: "asc" } }),
    prisma.essay.findMany({ where: { userId: user.id, score: { not: null }, createdAt: dateWhere }, orderBy: { createdAt: "asc" } }),
    prisma.quizQuestion.findMany({
      where: { isCorrect: false, quiz: { userId: user.id } },
      include: { quiz: true },
      take: 12,
    }),
  ]);

  const weeklyHours = lastWeeks().map((date, index) => {
    const start = new Date(date);
    start.setDate(start.getDate() - 6);
    const minutes = sessions
      .filter((session) => session.date >= start && session.date <= date)
      .reduce((sum, session) => sum + session.durationMinutes, 0);
    return { week: index === 7 ? "Atual" : `S-${7 - index}`, hours: Math.round((minutes / 60) * 10) / 10 };
  });

  const subjectPerformance = Object.values(
    quizzes.reduce<Record<string, { subject: string; total: number; count: number }>>((acc, quiz) => {
      acc[quiz.subject] ??= { subject: quiz.subject, total: 0, count: 0 };
      acc[quiz.subject].total += quiz.score ?? 0;
      acc[quiz.subject].count += 1;
      return acc;
    }, {}),
  ).map((item) => ({ subject: item.subject, score: Math.round(item.total / item.count) }));

  const essayScores = essays.map((essay) => ({ date: shortDate(essay.createdAt), score: Math.round(essay.score ?? 0) }));
  const evolutionSubjects = [...new Set(quizzes.map((quiz) => quiz.subject))].slice(0, 6);
  const subjectEvolution = quizzes.map((quiz, index) => ({
    label: `${index + 1}`,
    ...Object.fromEntries(evolutionSubjects.map((subject) => [subject, subject === quiz.subject ? Math.round(quiz.score ?? 0) : null])),
  }));
  const activeDays = new Map<string, number>();
  for (const session of sessions) activeDays.set(dayKey(session.date), (activeDays.get(dayKey(session.date)) ?? 0) + 1);
  for (const quiz of quizzes) activeDays.set(dayKey(quiz.createdAt), (activeDays.get(dayKey(quiz.createdAt)) ?? 0) + 1);
  for (const essay of essays) activeDays.set(dayKey(essay.createdAt), (activeDays.get(dayKey(essay.createdAt)) ?? 0) + 1);

  const heatmap = Array.from({ length: 98 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (97 - index));
    return activeDays.get(dayKey(date)) ?? 0;
  });
  const weakTopics = [...new Set(incorrectQuestions.map((item) => item.quiz.subject))].slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Desempenho</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Evolução dos estudos</h1>
      </div>

      <form className="flex flex-col gap-3 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="from" className="text-sm font-semibold text-[#0F172A]">Inicio</label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        </div>
        <div className="flex-1">
          <label htmlFor="to" className="text-sm font-semibold text-[#0F172A]">Fim</label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        </div>
        <button type="submit" className="h-9 rounded-xl bg-[#4F46E5] px-4 text-sm font-semibold text-white hover:bg-[#4338CA]">
          Filtrar
        </button>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0F172A]">Evolução geral</h2>
          <div className="mt-4">
            <WeeklyHoursChart data={weeklyHours} />
          </div>
        </section>
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0F172A]">Desempenho por matéria</h2>
          <div className="mt-4">
            <SubjectBarChart data={subjectPerformance} />
          </div>
        </section>
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0F172A]">Evolução por matéria</h2>
          <div className="mt-4">
            <SubjectEvolutionChart data={subjectEvolution} subjects={evolutionSubjects} />
          </div>
        </section>
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0F172A]">Historico de redacoes</h2>
          <div className="mt-4">
            <EssayLineChart data={essayScores} />
          </div>
        </section>
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#0F172A]">Mapa de calor de atividade</h2>
          <div className="mt-5 grid grid-cols-14 gap-1">
            {heatmap.map((count, index) => (
              <div key={index} className={`aspect-square rounded-sm ${count > 2 ? "bg-[#4F46E5]" : count > 0 ? "bg-[#A5B4FC]" : "bg-[#F1F5F9]"}`} />
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[20px] border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="size-5" />
          <h2 className="text-xl font-bold">Matérias com mais erros</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {weakTopics.length ? weakTopics.map((topic) => (
            <span key={topic} className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">
              {topic}
            </span>
          )) : <p className="text-sm text-[#64748B]">Complete quizzes para mapear seus pontos fracos.</p>}
        </div>
      </section>
    </div>
  );
}
