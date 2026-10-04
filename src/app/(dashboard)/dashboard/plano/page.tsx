import { CalendarCheck, Sparkles } from "lucide-react";
import { StudyPlanGenerator } from "@/components/study-plan/study-plan-generator";
import { StudySessionButton } from "@/components/study-plan/study-session-button";
import { formatMinutes } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";
import { getDayLabel, parseStudyPlan } from "@/lib/study-plan";

export default async function PlanoPage() {
  const user = await getCurrentUserOrRedirect();
  const prisma = getPrisma();
  const [profile, latestPlan] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: user.id } }),
    prisma.studyPlan.findFirst({ where: { userId: user.id, status: "active" }, orderBy: { createdAt: "desc" } }),
  ]);
  const plan = parseStudyPlan(latestPlan?.planData);
  const plannedMinutes = plan?.days.reduce((total, day) => total + day.blocks.reduce((sum, block) => sum + block.durationMinutes, 0), 0) ?? 0;
  const subjectCount = new Set(plan?.days.flatMap((day) => day.blocks.map((block) => block.subject)) ?? []).size;
  const simulatedCount = plan?.days.flatMap((day) => day.blocks).filter((block) => block.type === "simulado").length ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-brand-strong">Plano de Estudo</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Plano semanal</h1>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-tint px-3 py-2 text-sm font-bold text-brand-strong">
            <Sparkles className="size-4" />
            Gerado pela IA
          </div>
        </div>

        <StudyPlanGenerator
          goal={profile?.studyGoal ?? "ENEM"}
          dailyMinutes={profile?.dailyMinutes ?? 60}
          method={profile?.studyMethod ?? "pomodoro"}
          targetDate={profile?.targetDate ? profile.targetDate.toISOString().slice(0, 10) : null}
        />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {plan?.days.length ? plan.days.map((day) => (
            <div key={day.dayOfWeek} className="min-h-[300px] rounded-2xl border border-border bg-surface-muted p-4 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-ink">{getDayLabel(day.dayOfWeek)}</p>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-brand-strong shadow-card">
                  {day.blocks.length} blocos
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {day.blocks.map((item, index) => (
                  <div key={`${day.dayOfWeek}-${item.subject}-${item.topic}-${index}`} className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-card">
                    <div className="flex flex-col gap-1">
                      <p className="font-bold text-ink">{item.subject}</p>
                      <p className="text-ink-muted">{item.topic}</p>
                      <p className="text-xs font-medium text-brand-strong">{formatMinutes(item.durationMinutes)} · {item.method}</p>
                    </div>
                    <div className="mt-4">
                      <StudySessionButton subject={item.subject} durationMinutes={item.durationMinutes} method={item.method} notes={item.topic} type={item.type} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-sm text-ink-muted sm:col-span-2 2xl:col-span-3">
              Gere seu primeiro plano com as matérias reais que você quer estudar.
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
          <CalendarCheck className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">Resumo das metas</h2>
        <ul className="mt-5 space-y-3 text-sm text-ink-muted">
          <li>{formatMinutes(plannedMinutes)} planejados</li>
          <li>{subjectCount} matérias ativas</li>
          <li>{simulatedCount} simulados na semana</li>
          <li>{plan?.weeklyGoals.length ?? 0} metas semanais</li>
        </ul>
        {plan?.tips.length ? (
          <div className="mt-6 rounded-lg bg-surface-muted p-4">
            <p className="text-sm font-bold text-ink">Dica da IA</p>
            <p className="mt-2 text-sm text-ink-muted">{plan.tips[0]}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
