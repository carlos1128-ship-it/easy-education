import Link from "next/link";
import { ClipboardCheck, Clock, Landmark, Sparkles, Target } from "lucide-react";
import { LockedNotice } from "@/components/plan/usage-hint";
import { SimuladoCreateForm } from "@/components/quiz/simulado-create-form";
import { ConcursoCard } from "@/components/simulados/concurso-card";
import { EnemPicker } from "@/components/simulados/enem-picker";
import { percent } from "@/lib/bank/estimate";
import { resultHref, sessionHref } from "@/lib/bank/paths";
import { concursoTarget, isEnemStudent } from "@/lib/learner-profile";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import { startOfDaySP } from "@/lib/time-window";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

type HistoryItem = { id: string; href: string; title: string; detail: string; date: Date; badge: string; score: string };

export default async function SimuladosPage() {
  const { user, access } = await getStudentOrRedirect();
  const simuladoAllowance = allowanceFor(access.tier, "ai_simulado");
  const aiLocked = simuladoAllowance.kind === "locked";
  const prisma = getPrisma();
  const [profile, simulados, sessions, files] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id }, select: { personalization: true } }),
    prisma.quiz.findMany({ where: { userId: user.id, difficulty: "simulado" }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.bankSession.findMany({
      where: { userId: user.id, kind: { in: ["simulado", "diagnostic"] } },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: { answers: { select: { isCorrect: true } } },
    }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
  ]);

  const enem = isEnemStudent(profile?.personalization);
  const concurso = concursoTarget(profile?.personalization);
  const todayStart = startOfDaySP();
  const todayConcurso = concurso ? simulados.find((quiz) => quiz.title.startsWith("Simulado do dia") && quiz.createdAt >= todayStart) : undefined;

  const history: HistoryItem[] = [
    ...sessions.map((session) => {
      const total = Array.isArray(session.questionIds) ? session.questionIds.length : 0;
      const correct = session.answers.filter((answer) => answer.isCorrect).length;
      return {
        id: session.id,
        href: session.finishedAt ? resultHref(session.id) : sessionHref(session.id),
        title: session.title,
        detail: `${total} questões · prova anterior`,
        date: session.startedAt,
        badge: session.finishedAt ? "Concluído" : "Em andamento",
        score: session.finishedAt ? `${percent(correct, total)}%` : `${session.answers.length}/${total}`,
      };
    }),
    ...simulados.map((quiz) => ({
      id: quiz.id,
      href: `/dashboard/simulados/${quiz.id}`,
      title: quiz.title,
      detail: `${quiz.questionCount} questões · gerado por IA`,
      date: quiz.createdAt,
      badge: quiz.completedAt ? "Concluído" : "Disponível",
      score: quiz.score === null ? "Não iniciado" : `${Math.round(quiz.score)}%`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const finishedSessions = sessions.filter((session) => session.finishedAt);
  const completedQuizzes = simulados.filter((quiz) => quiz.score !== null);
  const scores = [
    ...finishedSessions.map((session) => percent(session.answers.filter((answer) => answer.isCorrect).length, Array.isArray(session.questionIds) ? session.questionIds.length : 0)),
    ...completedQuizzes.map((quiz) => quiz.score ?? 0),
  ];
  const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const answeredQuestions = finishedSessions.reduce((sum, session) => sum + session.answers.length, 0) + completedQuizzes.reduce((sum, quiz) => sum + quiz.questionCount, 0);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Simulados</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Prática em ritmo de prova</h1>
      </div>

      {enem ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
              <ClipboardCheck className="size-5 text-brand-strong" aria-hidden="true" /> Estude com provas anteriores do ENEM
            </h2>
            <p className="m-0 max-w-[760px] text-sm text-ink-muted">
              Questões oficiais do INEP, com o gabarito oficial e cronômetro no tempo da prova. No fim você vê quantas acertou, por área e por matéria. Livre em todos os planos.
            </p>
          </div>
          <EnemPicker />
          <p className="m-0 text-[13px] text-ink-muted">
            A nota do resultado é uma estimativa baseada no seu percentual de acerto, não a nota oficial do ENEM (que usa a TRI). Cada questão mostra a edição e a fonte.
          </p>
        </section>
      ) : null}

      {concurso ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 flex flex-wrap items-center gap-2 text-xl font-bold text-ink">
              <Landmark className="size-5 text-brand-strong" aria-hidden="true" /> Simulado personalizado do seu concurso
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-muted">Gerado por IA</span>
            </h2>
            <p className="m-0 max-w-[760px] text-sm text-ink-muted">
              As questões são criadas pela IA no estilo da banca do seu concurso. Não são questões de provas anteriores nem previsão da prova.
            </p>
          </div>
          {aiLocked ? (
            <LockedNotice
              feature="ai_simulado"
              title="O simulado do seu concurso faz parte dos planos pagos"
              description="Escolha um plano pago para receber um simulado novo do seu concurso, no estilo da banca."
            />
          ) : (
            <>
              <ConcursoCard role={concurso.role} board={concurso.board} todayQuizId={todayConcurso?.id ?? null} />
            </>
          )}
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
            <Sparkles className="size-5 text-brand-strong" aria-hidden="true" /> Simulados gerados com IA
          </h2>
          <p className="m-0 max-w-[760px] text-sm text-ink-muted">Escolha as matérias ou um material seu e a IA monta um simulado no estilo da sua prova.</p>
        </div>
        {aiLocked ? (
          <LockedNotice
            feature="ai_simulado"
            title="Simulados gerados por IA fazem parte dos planos pagos"
            description={enem ? "No plano Gratuito os simulados com provas anteriores do ENEM continuam liberados. Para gerar simulados novos com IA, escolha um plano pago." : "Para gerar simulados com IA no estilo da sua prova, escolha um plano pago."}
          />
        ) : (
          <div className="space-y-3">
            <SimuladoCreateForm files={files} maxQuestions={simuladoAllowance.kind === "limit" ? simuladoAllowance.max : 20} />
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Simulados concluídos", value: String(scores.length), icon: ClipboardCheck },
          { label: "Média de acerto", value: `${average}%`, icon: Target },
          { label: "Questões respondidas", value: String(answeredQuestions), icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-tint text-brand-strong">
              <Icon size={20} />
            </div>
            <p className="text-[28px] font-extrabold leading-none text-brand">{value}</p>
            <p className="mt-1 text-[13px] font-medium text-ink-muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-bold text-ink">Seus simulados</h2>
        </div>
        <div className="divide-y divide-border">
          {history.length ? (
            history.map((item) => (
              <Link key={item.id} href={item.href} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
                  <ClipboardCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">{item.title}</p>
                  <p className="text-sm text-ink-muted">
                    {item.detail} · {dateFormat.format(item.date)}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-strong">{item.badge}</span>
                <span className="text-sm font-medium text-ink-muted">{item.score}</span>
              </Link>
            ))
          ) : (
            <div className="p-5 text-sm text-ink-muted">Seus simulados aparecem aqui, com o resultado de cada um, para você acompanhar a evolução.</div>
          )}
        </div>
      </section>
    </div>
  );
}
