import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileText, Flame, Lock, PenTool, PlayCircle, RotateCcw, Sparkles, Target } from "lucide-react";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMinutes, shortDate } from "@/lib/format";
import { concursoTarget, isEnemStudent } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { allowanceFor, PLANS } from "@/lib/plans";
import { getStudentOrRedirect } from "@/lib/server-user";
import { getTrailForUser } from "@/lib/study-trail";
import { getTodayPlanBlocks, parseStudyPlan } from "@/lib/study-plan";
import { calculateStreak, startOfToday, startOfWindow } from "@/lib/study-stats";
import { cn } from "@/lib/utils";

/* Apresentação */

function firstName(name?: string | null) {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.includes("@")) return "";
  return first.charAt(0).toLocaleUpperCase("pt-BR") + first.slice(1).toLocaleLowerCase("pt-BR");
}

function formatAmount(minutes: number) {
  return minutes > 0 ? formatMinutes(minutes) : "0";
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

const RING = 2 * Math.PI * 26;

const card = "rounded-2xl border border-border bg-surface shadow-card";
const h2 = "m-0 text-lg font-bold text-ink";

function badgeTone(badge: string) {
  if (badge === "Pendente" || badge === "Corrigindo") return "warning";
  if (badge === "Pronto") return "success";
  return "neutral";
}

export default async function DashboardPage() {
  const { user, access } = await getStudentOrRedirect();
  const prisma = getPrisma();
  const trailLocked = allowanceFor(access.tier, "trail").kind === "locked";
  const weekStart = startOfWindow(6);

  const [trail, profile, sessions, quizzes, essays, dueCards, latestPlan, files, decks, bankAnswers, diagnostics, reviewsDue] = await Promise.all([
    trailLocked ? Promise.resolve(null) : getTrailForUser(user.id),
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.studySession.findMany({ where: { userId: user.id, date: { gte: weekStart } }, orderBy: { date: "desc" } }),
    prisma.quiz.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.essay.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.flashcard.findMany({ where: { deck: { userId: user.id }, nextReview: { lte: new Date() } }, include: { deck: true }, take: 4 }),
    prisma.studyPlan.findFirst({ where: { userId: user.id, status: "active" }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, name: true, processed: true } }),
    prisma.flashcardDeck.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 2 }),
    prisma.bankAnswer.count({ where: { userId: user.id } }),
    prisma.bankSession.count({ where: { userId: user.id, kind: "diagnostic" } }),
    prisma.questionReview.count({ where: { userId: user.id, nextReview: { lte: new Date() } } }),
  ]);
  const enem = isEnemStudent(profile?.personalization);
  const concurso = concursoTarget(profile?.personalization);

  const completedQuizzes = quizzes.filter((quiz) => quiz.score !== null);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const todayStart = startOfToday();
  const todayMinutes = sessions.filter((session) => session.date >= todayStart).reduce((sum, session) => sum + session.durationMinutes, 0);
  const quizAverage = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, quiz) => sum + (quiz.score ?? 0), 0) / completedQuizzes.length)
    : 0;
  const lastEssay = essays.find((essay) => essay.score !== null);
  const streak = calculateStreak([...sessions.map((item) => item.date), ...completedQuizzes.map((item) => item.completedAt ?? item.createdAt)]);
  const plan = parseStudyPlan(latestPlan?.planData);
  const todayBlocks = getTodayPlanBlocks(plan);
  const goalMinutes = profile?.dailyMinutes ?? 60;
  const dailyProgress = Math.min(100, Math.round((todayMinutes / Math.max(goalMinutes, 1)) * 100));
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

  /* Textos derivados dos dados (só apresentação) */
  const name = firstName(profile?.name);
  const hasAnyData = quizzes.length > 0 || sessions.length > 0 || essays.length > 0 || files.length > 0 || decks.length > 0;
  const planMinutes = todayBlocks.reduce((sum, block) => sum + block.durationMinutes, 0);
  const todayParts = [
    todayBlocks.length ? `${plural(todayBlocks.length, "tarefa", "tarefas")} no plano (${formatMinutes(planMinutes)} de estudo)` : null,
    dueCards.length
      ? `${plural(dueCards.length, "revisão de flashcards que vence", "revisões de flashcards que vencem")} hoje`
      : null,
  ].filter(Boolean);
  const heroText = todayParts.length
    ? `Hoje você tem ${todayParts.join(" e ")}.${todayBlocks[0] ? ` Comece por ${todayBlocks[0].subject}.` : ""}`
    : hasAnyData
      ? "Seu painel acompanha progresso real, gerações da IA e revisões feitas na plataforma."
      : "Comece gerando seu primeiro quiz. Seu acerto, suas horas e sua sequência aparecem aqui assim que você estudar.";

  const metas = [
    {
      title: "Meta diária",
      progress: dailyProgress,
      sub: `${formatAmount(todayMinutes)} de ${formatMinutes(goalMinutes)}`,
      hint: todayMinutes >= goalMinutes ? "Meta de hoje cumprida" : `Faltam ${formatMinutes(goalMinutes - todayMinutes)} hoje`,
    },
    {
      title: "Meta semanal",
      progress: weeklyProgress,
      sub: `${formatAmount(totalMinutes)} de ${formatMinutes(weeklyGoalMinutes)}`,
      hint: totalMinutes >= weeklyGoalMinutes ? "Meta da semana cumprida" : `Faltam ${formatMinutes(weeklyGoalMinutes - totalMinutes)}`,
    },
  ];

  // Primeiros passos: some quando o aluno já usou cada parte principal do app.
  const firstSteps = [
    { label: "Criar seu plano de estudos", done: Boolean(latestPlan), href: "/dashboard/plano" },
    ...(enem
      ? [
          { label: "Fazer um simulado com prova anterior do ENEM", done: bankAnswers > 0, href: "/dashboard/simulados" },
          { label: "Fazer o simulado diagnóstico", done: diagnostics > 0, href: "/dashboard/simulados" },
        ]
      : []),
    ...(allowanceFor(access.tier, "file_upload").kind === "locked" ? [] : [{ label: "Enviar um material (PDF ou foto)", done: files.length > 0, href: "/dashboard/arquivos" }]),
    ...(allowanceFor(access.tier, "ai_quiz").kind === "locked" ? [] : [{ label: "Responder seu primeiro quiz", done: completedQuizzes.length > 0, href: "/dashboard/quizzes" }]),
    ...(allowanceFor(access.tier, "essay_correction").kind === "locked" ? [] : [{ label: "Corrigir uma redação", done: essays.length > 0, href: "/dashboard/redacao" }]),
  ];
  const firstStepsDone = firstSteps.filter((item) => item.done).length;
  const nextStep = firstSteps.find((item) => !item.done);

  const stats = [
    { label: "Horas esta semana", icon: Clock, value: formatMinutes(totalMinutes), empty: totalMinutes === 0, step: "Começar estudo de hoje", href: "/dashboard/plano" },
    { label: "Acerto nos quizzes", icon: Target, value: `${quizAverage}%`, empty: completedQuizzes.length === 0, step: "Gerar seu primeiro quiz", href: "/dashboard/quizzes" },
    { label: "Média em redações", icon: FileText, value: lastEssay?.score ? `${Math.round(lastEssay.score)} pts` : "0 pts", empty: !lastEssay?.score, step: "Enviar primeira redação", href: "/dashboard/redacao" },
    { label: "Sequência de estudo", icon: Flame, value: `${streak} ${streak === 1 ? "dia" : "dias"}`, empty: streak === 0, step: "Estudar hoje para começar", href: "/dashboard/plano" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
      <section className={cn("flex flex-col items-stretch gap-6 rounded-3xl border border-border bg-hero-panel p-5 shadow-card lg:flex-row lg:p-8")}>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="m-0 text-[15px] font-medium text-ink-muted">{name ? `Olá, ${name}` : "Olá"}</p>
          <h1 className="m-0 text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink [text-wrap:balance] lg:text-4xl lg:leading-[1.15]">
            {profile?.studyGoal ? `Foco em ${profile.studyGoal}` : "Seu painel de estudos"}
          </h1>
          <p className="m-0 max-w-[520px] text-base leading-[1.55] text-ink-muted [text-wrap:pretty]">{heroText}</p>
          <div className="mt-2.5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/plano"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline transition-colors hover:bg-brand-strong"
            >
              Começar estudo de hoje
            </Link>
            <Link
              href="/dashboard/chat"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-border-strong bg-surface px-5 text-[15px] font-medium text-ink no-underline transition-colors hover:bg-surface-muted"
            >
              Perguntar à IA
            </Link>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-x-8 gap-y-5 self-center sm:grid-cols-2 lg:w-[520px] xl:w-[600px]">
          {metas.map((meta) => (
            <div key={meta.title} className="flex items-center gap-3.5">
              <div className="relative size-[52px] flex-shrink-0 lg:size-[60px]">
                <svg width="100%" height="100%" viewBox="0 0 64 64" className="-rotate-90" aria-hidden="true">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="var(--track)" strokeWidth="6" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(RING * meta.progress) / 100} ${RING}`}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-[13px] font-bold text-ink">{meta.progress}%</span>
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-[15px] font-bold text-ink">{meta.title}</div>
                <div className="text-[13px] text-ink-muted">{meta.sub}</div>
                <div className="text-xs font-medium text-brand-strong">{meta.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {nextStep ? (
        <section className={cn(card, "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-6 lg:p-6")} aria-label="Primeiros passos">
          <OwlMascot mood="piscando" size={88} className="hidden lg:flex" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className={h2}>Primeiros passos</h2>
              <span className="text-[13px] font-medium text-ink-muted">
                {firstStepsDone} de {firstSteps.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-track" aria-hidden="true">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(firstStepsDone / firstSteps.length) * 100}%` }} />
            </div>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {firstSteps.map((item) => (
                <li key={item.label}>
                  {item.done ? (
                    <span className="flex items-center gap-2 text-sm text-ink-muted line-through decoration-ink-muted/50">
                      <CheckCircle2 size={18} strokeWidth={2} className="flex-shrink-0 text-success" aria-hidden="true" />
                      {item.label}
                      <span className="sr-only">(feito)</span>
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium no-underline hover:underline",
                        item === nextStep ? "text-brand-strong" : "text-ink",
                      )}
                    >
                      <span className="size-[18px] flex-shrink-0 rounded-full border-2 border-border-strong" aria-hidden="true" />
                      {item.label}
                      {item === nextStep ? <ArrowRight size={14} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" /> : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Simulados (provas anteriores do ENEM ou simulado do concurso), revisão e personalização. */}
      <section className={cn("grid gap-4", enem ? "md:grid-cols-3" : "md:grid-cols-2")} aria-label="Simulados e personalização">
        <Link href="/dashboard/simulados" className={cn(card, "flex items-start gap-3 p-4 no-underline transition-colors hover:border-border-strong lg:p-5")}>
          <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong"><ClipboardCheck size={20} aria-hidden="true" /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink">{enem ? "Provas anteriores do ENEM" : concurso ? "Simulado do seu concurso" : "Simulados"}</span>
            <span className="text-sm text-ink-muted">
              {enem
                ? "Simulados de 90 questões, como no dia da prova, com o resumo do que você acertou."
                : concurso
                  ? `Simulados${concurso.role ? ` para ${concurso.role}` : " do seu concurso"}, no estilo da banca.`
                  : "Treino no ritmo de prova, no estilo do que você estuda."}
            </span>
          </span>
        </Link>
        {enem ? (
        <Link href="/dashboard/revisao" className={cn(card, "flex items-start gap-3 p-4 no-underline transition-colors hover:border-border-strong lg:p-5")}>
          <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong"><RotateCcw size={20} aria-hidden="true" /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink">Revisão espaçada</span>
            <span className="text-sm text-ink-muted">{reviewsDue > 0 ? `${plural(reviewsDue, "questão para revisar", "questões para revisar")} hoje.` : "As questões que você errar nos simulados voltam aqui na hora certa."}</span>
          </span>
        </Link>
        ) : null}
        <div className={cn(card, "flex items-start gap-3 p-4 lg:p-5")}>
          <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong"><Target size={20} aria-hidden="true" /></span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink">Sua personalização</span>
            <span className="text-sm text-ink-muted">{profile?.studyGoal ?? "Estudos gerais"} · {formatMinutes(goalMinutes)} por dia · plano {PLANS[access.tier].name}.</span>
            <Link href="/onboarding" className="text-sm font-semibold text-brand-strong underline underline-offset-2">Ajustar</Link>
          </span>
        </div>
      </section>

      {trailLocked ? (
        <section className={cn(card, "flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:gap-6 lg:p-6")} aria-label="Sua trilha">
          <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-tint text-brand-strong"><Lock size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className={h2}>Trilha de estudos</h2>
            <p className="m-0 mt-1 text-sm text-ink-muted">Cada dia do plano vira um nível, com troféus. Faz parte dos planos pagos.</p>
          </div>
          <Link href="/assinar?plano=basico" className="inline-flex min-h-11 flex-none items-center justify-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted">
            Ver o que libera
          </Link>
        </section>
      ) : null}

      {trail?.currentUnit ? (
        <section className={cn(card, "flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-8 lg:p-6")} aria-label="Sua trilha">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="m-0 text-[13px] font-bold uppercase tracking-[0.6px] text-brand-strong">
              Trilha · Seção {trail.currentUnit.section} · Nível {Math.min(63, trail.doneCount + (trail.todayDone ? 0 : 1))}
            </p>
            <h2 className={h2}>{trail.currentUnit.title}</h2>
            <p className="m-0 text-sm text-ink-muted">
              {trail.current ? (
                <>
                  Hoje: <span className="font-medium text-ink">{trail.current.progress?.label}</span> ou a atividade do plano
                </>
              ) : (
                "Dia de hoje concluído. Volte amanhã para o próximo nível."
              )}
            </p>
          </div>
          <ol className="m-0 flex list-none items-center gap-1.5 p-0" aria-label="Dias da seção">
            {trail.currentUnit.nodes.filter((node) => node.kind === "dia").map((node) => (
              <li
                key={node.id}
                className={cn(
                  "size-3.5 rounded-full",
                  node.status === "done" ? "bg-brand" : node.status === "current" ? "bg-brand-tint ring-2 ring-brand" : "bg-track",
                )}
              >
                <span className="sr-only">
                  {node.title}: {node.status === "done" ? "concluída" : node.status === "current" ? "atual" : "bloqueada"}
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/dashboard/trilha"
            className="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline transition-colors hover:bg-brand-strong"
          >
            Continuar trilha
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, icon: Icon, value, empty, step, href }) => (
          <div key={label} className={cn(card, "flex flex-col gap-3 p-4 lg:p-6")}>
            <div className="grid size-10 place-items-center rounded-lg bg-brand-tint text-brand-strong">
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </div>
            {empty ? (
              <div className="flex flex-col gap-1">
                <div className="text-[13px] text-ink-muted">{label}</div>
                <Link href={href} className="flex items-center gap-1.5 text-[15px] font-bold leading-[1.3] text-brand-strong no-underline hover:underline">
                  {step}
                  <ArrowRight size={16} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-brand">{value}</div>
                <div className="text-[13px] text-ink-muted">{label}</div>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 items-start gap-5 pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <div className={cn(card, "overflow-hidden")}>
            <div className="flex items-center justify-between border-b border-border px-4 py-[18px] lg:px-6">
              <h2 className={h2}>Plano de hoje</h2>
              <span className="flex items-center gap-1 rounded-full bg-brand-tint px-2 py-1 text-xs font-medium text-brand-strong">
                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
                Gerado pela IA
              </span>
            </div>
            {todayBlocks.length ? (
              <div className="flex flex-col">
                {todayBlocks.map((item, index) => (
                  <div
                    key={`${item.subject}-${item.topic}-${index}`}
                    className="-mt-px flex items-center gap-3.5 border-t border-border px-4 py-3.5 lg:px-6"
                  >
                    <span className="size-2.5 flex-shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[15px] font-medium text-ink">{item.subject}</p>
                      <p className="m-0 text-[13px] text-ink-muted">
                        {item.topic} · {formatMinutes(item.durationMinutes)} · {item.method}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/plano"
                      className="inline-flex min-h-10 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border-strong bg-surface px-3.5 text-sm font-medium text-ink no-underline transition-colors hover:bg-surface-muted"
                    >
                      <PlayCircle size={16} strokeWidth={1.75} aria-hidden="true" />
                      Registrar
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 lg:p-6">
                <EmptyState icon={CalendarDays} title="Nenhum plano gerado ainda." description="Gere um plano semanal com IA para ativar as tarefas de hoje na página Plano." />
              </div>
            )}
          </div>

          <div className={cn(card, "flex flex-col p-4 lg:p-6")}>
            <h2 className={cn(h2, "mb-2")}>Atividade recente</h2>
            {activity.length ? (
              activity.map((item) => {
                const tone = badgeTone(item.badge);
                return (
                  <Link
                    key={`${item.href}-${item.title}`}
                    href={item.href}
                    className="-mx-2 flex items-center gap-3 rounded-lg border-b border-border px-2 py-3.5 no-underline transition-colors last-of-type:border-b-0 hover:bg-surface-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[15px] font-medium text-ink" title={item.title}>{item.title}</p>
                      <p className="m-0 text-[13px] text-ink-muted">{item.sub}</p>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-[5px] whitespace-nowrap rounded-full px-[9px] py-1.5 text-xs font-medium leading-none",
                        tone === "warning" && "bg-warning-tint text-warning",
                        tone === "success" && "bg-success-tint text-success",
                        tone === "neutral" && "border border-border bg-surface text-ink-muted",
                      )}
                    >
                      {tone === "warning" ? <Clock size={14} strokeWidth={2} aria-hidden="true" /> : null}
                      {tone === "success" ? <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" /> : null}
                      {item.badge}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong p-4">
                <p className="m-0 text-sm text-ink-muted">Suas atividades aparecem aqui assim que você gerar quizzes, revisar cards ou enviar redações.</p>
                <Link href="/dashboard/quizzes" className="inline-flex min-h-10 items-center rounded-lg bg-brand-tint px-4 text-sm font-medium text-brand-strong no-underline">
                  Gerar seu primeiro quiz
                </Link>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Link href="/dashboard/desempenho" className="flex items-center gap-1 text-sm font-medium text-brand-strong no-underline hover:underline">
                Ver tudo <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className={cn(card, "flex flex-col gap-4 p-4 lg:p-6")}>
            <div className="flex items-center justify-between">
              <h2 className={h2}>Desempenho</h2>
              <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-ink-muted">Quizzes</span>
            </div>
            {performance.length ? (
              performance.map((item) => (
                <div key={item.subject} className="flex flex-col gap-2">
                  <div className="flex justify-between gap-3 text-sm font-medium text-ink">
                    <span className="truncate" title={item.subject}>{item.subject}</span>
                    <span className="whitespace-nowrap">{item.score}% de acerto</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border-strong p-4">
                <p className="m-0 text-sm text-ink-muted [text-wrap:pretty]">Seu acerto por matéria aparece aqui depois do primeiro quiz.</p>
                <Link href="/dashboard/quizzes" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg bg-brand-tint px-4 text-sm font-medium text-brand-strong no-underline">
                  Gerar seu primeiro quiz
                </Link>
              </div>
            )}
          </div>

          <div className={cn(card, "flex flex-col gap-4 p-4 lg:p-6")}>
            <h2 className={h2}>Próximas revisões</h2>
            {dueCards.length ? (
              <div className="-mx-2 flex flex-col">
                {dueCards.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/flashcards/${item.deckId}`}
                    title={item.deck.title}
                    className="flex min-w-0 items-center gap-3 rounded-lg border-b border-border px-2 py-3 no-underline transition-colors last:border-b-0 hover:bg-surface-muted"
                  >
                    <span className="grid size-8 flex-none place-items-center rounded-[8px] bg-brand-tint text-brand-strong">
                      <BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-medium leading-[1.4] text-ink">{item.deck.title}</span>
                    <span className="flex flex-none items-center gap-[5px] whitespace-nowrap rounded-full bg-warning-tint px-[9px] py-1.5 text-xs font-medium leading-none text-warning">
                      <Clock size={14} strokeWidth={2} aria-hidden="true" />
                      Vence hoje
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-surface-muted p-4 text-sm text-ink-muted">
                <CheckCircle2 className="size-4 flex-shrink-0 text-success" aria-hidden="true" />
                Nenhum flashcard vencido agora.
              </div>
            )}
          </div>

          <div className={cn(card, "flex flex-col gap-4 p-4 lg:p-6")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={cn(h2, "flex items-center gap-2")}>
                  <PenTool size={18} strokeWidth={1.75} className="text-brand-strong" aria-hidden="true" />
                  Redação
                </h2>
                <p className="m-0 mt-1 text-sm text-ink-muted">Última nota</p>
              </div>
              <div className="rounded-lg bg-brand-tint px-3 py-1.5 text-brand-strong">
                <span className="text-xl font-bold">{lastEssay?.score ? Math.round(lastEssay.score) : 0}</span>
                <span className="text-xs font-bold">/1000</span>
              </div>
            </div>
            <Link
              href="/dashboard/redacao"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-tint font-medium text-brand-strong no-underline transition-colors hover:bg-brand-soft"
            >
              <PenTool size={16} strokeWidth={1.75} aria-hidden="true" />
              Enviar nova redação
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
