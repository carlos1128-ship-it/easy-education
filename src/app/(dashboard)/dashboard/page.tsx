import Link from "next/link";
import { BookOpen, CheckCircle2, ChevronRight, Clock, FileText, Flame, PenTool, PlayCircle, Sparkles, Target } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutes, shortDate } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";
import { ensureWeeklySimuladoForUser } from "@/lib/simulado";
import { getTodayPlanBlocks, parseStudyPlan } from "@/lib/study-plan";
import { getSubjectColor } from "@/lib/subjects";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWindow(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function calculateStreak(dates: Date[]) {
  const active = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = startOfToday();
  while (active.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  const user = await getCurrentUserOrRedirect();
  const prisma = getPrisma();
  const weekStart = startOfWindow(6);
  await ensureWeeklySimuladoForUser(user.id);

  const [profile, sessions, quizzes, essays, dueCards, latestPlan, files, decks] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.studySession.findMany({ where: { userId: user.id, date: { gte: weekStart } }, orderBy: { date: "desc" } }),
    prisma.quiz.findMany({ where: { userId: user.id }, include: { questions: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.essay.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.flashcard.findMany({ where: { deck: { userId: user.id }, nextReview: { lte: new Date() } }, include: { deck: true }, take: 4 }),
    prisma.studyPlan.findFirst({ where: { userId: user.id, status: "active" }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.flashcardDeck.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 2 }),
  ]);

  const completedQuizzes = quizzes.filter((quiz) => quiz.score !== null);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const quizAverage = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, quiz) => sum + (quiz.score ?? 0), 0) / completedQuizzes.length)
    : 0;
  const lastEssay = essays.find((essay) => essay.score !== null);
  const streak = calculateStreak([...sessions.map((item) => item.date), ...completedQuizzes.map((item) => item.completedAt ?? item.createdAt)]);
  const plan = parseStudyPlan(latestPlan?.planData);
  const todayBlocks = getTodayPlanBlocks(plan);
  const goalMinutes = profile?.dailyMinutes ?? 60;
  const dailyProgress = Math.min(100, Math.round((totalMinutes / Math.max(goalMinutes, 1)) * 100));
  const weeklyGoalMinutes = goalMinutes * 7;
  const weeklyProgress = Math.min(100, Math.round((totalMinutes / Math.max(weeklyGoalMinutes, 1)) * 100));

  const performance = Object.values(
    completedQuizzes.reduce<Record<string, { subject: string; total: number; count: number }>>((acc, quiz) => {
      acc[quiz.subject] ??= { subject: quiz.subject, total: 0, count: 0 };
      acc[quiz.subject].total += quiz.score ?? 0;
      acc[quiz.subject].count += 1;
      return acc;
    }, {}),
  ).map((item) => ({ subject: item.subject, score: Math.round(item.total / item.count) }));

  const activity = [
    ...quizzes.slice(0, 2).map((quiz) => ({
      title: quiz.title,
      sub: `${quiz.questionCount} questões · ${shortDate(quiz.createdAt)}`,
      href: quiz.difficulty === "simulado" ? `/dashboard/simulados/${quiz.id}` : `/dashboard/quizzes/${quiz.id}`,
      badge: quiz.score === null ? "Pendente" : `${Math.round(quiz.score)}%`,
    })),
    ...essays.slice(0, 1).map((essay) => ({ title: essay.title, sub: `${essay.theme ?? "Redação"} · ${shortDate(essay.createdAt)}`, href: "/dashboard/redacao", badge: essay.score === null ? "Corrigindo" : `${Math.round(essay.score)} pts` })),
    ...files.slice(0, 1).map((file) => ({ title: file.name, sub: file.processed ? "Processado" : "Aguardando processamento", href: "/dashboard/arquivos", badge: file.processed ? "Pronto" : "Pendente" })),
    ...decks.slice(0, 1).map((deck) => ({ title: deck.title, sub: deck.subject, href: `/dashboard/flashcards/${deck.id}`, badge: "Deck" })),
  ].slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-gradient-to-r from-[#EEF2FF] to-white p-8 shadow-sm dark:border-[#1A2744] dark:from-[#0F1629] dark:via-[#131D35] dark:to-[#0D1117]">
        <div className="pointer-events-none absolute right-0 top-0 hidden h-80 w-80 translate-x-1/3 -translate-y-1/2 rounded-full bg-[#06B6D4]/10 blur-3xl dark:block" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 hidden h-64 w-64 translate-y-1/2 rounded-full bg-[#6366F1]/10 blur-3xl dark:block" />
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex-1">
            <p className="mb-1 text-sm font-medium text-[#64748B]">Ola, {profile?.name ?? user.email}</p>
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
              {profile?.studyGoal ? `Foco em ${profile.studyGoal}` : "Seu painel de estudos"}
            </h1>
            <p className="mb-6 max-w-xl text-base text-[#64748B]">
              Seu painel acompanha progresso real, gerações da IA e revisões feitas na plataforma.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/plano" className="rounded-xl bg-[#4F46E5] px-6 py-2.5 font-semibold text-white shadow-sm shadow-[#4F46E5]/20 transition-all hover:-translate-y-0.5 hover:bg-[#4338CA]">
                Começar estudo de hoje
              </Link>
              <Link href="/dashboard/chat" className="rounded-xl border-2 border-[#4F46E5]/20 px-6 py-2.5 font-semibold text-[#4F46E5] transition-all hover:bg-[#EEF2FF] dark:border-[#6366F1]/35 dark:text-[#C7D2FE] dark:hover:bg-[#6366F1]/15">
                Perguntar a IA
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Meta diária", progress: dailyProgress, done: totalMinutes, goal: goalMinutes, color: "#4F46E5" },
              { label: "Meta semanal", progress: weeklyProgress, done: totalMinutes, goal: weeklyGoalMinutes, color: "#06B6D4" },
            ].map((item) => (
              <div key={item.label} className="flex min-w-[200px] items-center gap-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={item.color} strokeDasharray={`${item.progress}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                  </svg>
                  <span className="absolute text-sm font-bold text-[#0F172A]">{item.progress}%</span>
                </div>
                <div>
                  <p className="font-bold text-[#0F172A]">{item.label}</p>
                  <p className="text-sm text-[#64748B]">{formatMinutes(item.done)} / {formatMinutes(item.goal)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Horas esta semana", value: formatMinutes(totalMinutes), icon: Clock, color: "#4F46E5" },
          { label: "Acerto nos quizzes", value: `${quizAverage}%`, icon: Target, color: "#8B5CF6" },
          { label: "Média em redações", value: lastEssay?.score ? `${Math.round(lastEssay.score)} pts` : "0 pts", icon: FileText, color: "#06B6D4" },
          { label: "Sequência", value: `${streak} dias`, icon: Flame, color: "#F97316" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ backgroundColor: `${color}18`, color }}>
              <Icon size={20} />
            </div>
            <p className="mb-1 text-[28px] font-bold leading-none text-[#0F172A]">{value}</p>
            <p className="text-[13px] font-medium text-[#64748B]">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 pb-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="overflow-hidden rounded-[20px] border border-[#E2E8F0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-5">
              <h2 className="text-lg font-bold text-[#0F172A]">Plano de hoje</h2>
              <span className="flex items-center gap-1 rounded-md bg-[#8B5CF6]/10 px-2.5 py-1 text-xs font-bold text-[#8B5CF6]">
                <Sparkles size={12} />
                IA
              </span>
            </div>
            {todayBlocks.length ? (
              <div className="flex flex-col">
                {todayBlocks.map((item, index) => (
                  <div key={`${item.subject}-${item.topic}-${index}`} className="flex items-center gap-4 border-b border-[#F1F5F9] p-4 last:border-b-0">
                    <div className="h-3 w-3 rounded-full bg-[#4F46E5]" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{item.subject}</p>
                      <p className="text-xs text-[#64748B]">{item.topic} · {formatMinutes(item.durationMinutes)} · {item.method}</p>
                    </div>
                    <Link href="/dashboard/plano" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]">
                      <PlayCircle className="size-4" />
                      Registrar
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState icon={Sparkles} title="Nenhum plano gerado ainda." description="Gere um plano semanal com IA para ativar as tarefas de hoje na página Plano." />
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-[#0F172A]">Atividade recente</h2>
            {activity.length ? (
              <div className="space-y-3">
                {activity.map((item) => (
                  <Link key={`${item.href}-${item.title}`} href={item.href} className="flex items-start justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-sm transition-colors hover:border-[#4F46E5]/30">
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[#64748B]">{item.sub}</p>
                    </div>
                    <span className="rounded bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold uppercase text-[#4F46E5]">{item.badge}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">Suas atividades aparecem aqui assim que você gerar quizzes, revisar cards ou enviar redacoes.</p>
            )}
            <div className="mt-4 flex justify-end">
              <Link href="/dashboard/desempenho" className="flex items-center gap-1 text-sm font-bold text-[#4F46E5] hover:text-[#4338CA]">
                Ver tudo <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F172A]">Desempenho</h2>
              <span className="rounded-md bg-[#F1F5F9] px-2.5 py-1 text-xs font-bold text-[#64748B]">Quizzes</span>
            </div>
            <div className="space-y-4">
              {performance.length ? performance.map((item) => (
                <div key={item.subject}>
                  <div className="mb-1.5 flex justify-between text-sm font-bold text-[#0F172A]">
                    <span>{item.subject}</span>
                    <span>{item.score}%</span>
                  </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: getSubjectColor(item.subject) }} />
                  </div>
                </div>
              )) : <p className="text-sm text-[#64748B]">Complete quizzes para ver desempenho por matéria.</p>}
            </div>
          </div>

          <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-[#0F172A]">Próximas revisões</h2>
            {dueCards.length ? (
              <div className="grid grid-cols-2 gap-3">
                {dueCards.map((item) => (
                  <Link key={item.id} href={`/dashboard/flashcards/${item.deckId}`} className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 transition-colors hover:border-[#4F46E5]/30">
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
                      <BookOpen size={16} />
                    </div>
                    <p className="mb-1 text-sm font-bold leading-tight text-[#0F172A]">{item.deck.title}</p>
                    <p className="text-[11px] font-bold text-[#EF4444]">Vence hoje</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                <CheckCircle2 className="size-4 text-[#22C55E]" />
                Nenhum flashcard vencido agora.
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-[#0F172A]">
                  <PenTool size={18} className="text-[#06B6D4]" />
                  Redação
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">Ultima nota</p>
              </div>
              <div className="rounded-lg bg-[#06B6D4]/10 px-3 py-1.5 text-[#06B6D4]">
                <span className="text-xl font-bold">{lastEssay?.score ? Math.round(lastEssay.score) : 0}</span>
                <span className="text-xs font-bold">/1000</span>
              </div>
            </div>
            <Link href="/dashboard/redacao" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#EEF2FF] py-2.5 font-bold text-[#4F46E5] transition-colors hover:bg-[#E0E7FF]">
              <PenTool size={16} />
              Enviar nova redação
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
