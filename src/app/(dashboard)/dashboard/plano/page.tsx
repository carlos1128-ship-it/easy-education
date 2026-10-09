import { CalendarCheck, Sparkles } from "lucide-react";
import { UsageHint } from "@/components/plan/usage-hint";
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

  const summary = [
    { label: "planejados na semana", value: formatMinutes(plannedMinutes) },
    { label: "matérias ativas", value: String(subjectCount) },
    { label: "simulados na semana", value: String(simulatedCount) },
    { label: "metas semanais", value: String(plan?.weeklyGoals.length ?? 0) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8">
      <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
            <Sparkles className="size-4" aria-hidden="true" />
            Plano de estudo gerado pela IA
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Plano semanal</h1>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="flex flex-col">
              <dt className="order-2 text-[13px] font-medium text-ink-muted">{item.label}</dt>
              <dd className="order-1 m-0 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-brand">{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {plan?.tips.length ? (
        <p className="m-0 flex items-start gap-3 border-l-4 border-brand pl-4 text-[15px] text-ink-muted">
          <CalendarCheck className="mt-0.5 size-5 flex-none text-brand-strong" aria-hidden="true" />
          <span>
            <span className="font-bold text-ink">Dica da IA: </span>
            {plan.tips[0]}
          </span>
        </p>
      ) : null}

      <div className="-mb-4">
        <UsageHint feature="study_plan" />
      </div>

      <StudyPlanGenerator
        goal={profile?.studyGoal ?? "Estudos gerais"}
        dailyMinutes={profile?.dailyMinutes ?? 60}
        method={profile?.studyMethod ?? "pomodoro"}
        targetDate={profile?.targetDate ? profile.targetDate.toISOString().slice(0, 10) : null}
      />

      <section aria-label="Semana" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {plan?.days.length ? plan.days.map((day) => (
          <div key={day.dayOfWeek} className="flex min-h-[280px] flex-col gap-3 rounded-2xl bg-surface-muted p-3">
            <div className="flex items-center justify-between gap-3 px-1 pt-1">
              <p className="m-0 text-lg font-bold text-ink">{getDayLabel(day.dayOfWeek)}</p>
              <span className="text-xs font-medium text-ink-muted">
                {day.blocks.length} {day.blocks.length === 1 ? "bloco" : "blocos"}
              </span>
            </div>
            {day.blocks.map((item, index) => (
              <div key={`${day.dayOfWeek}-${item.subject}-${item.topic}-${index}`} className="flex flex-1 flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-sm shadow-card">
                <div className="flex flex-col gap-1">
                  <p className="m-0 font-bold text-ink">{item.subject}</p>
                  <p className="m-0 text-ink-muted">{item.topic}</p>
                  <p className="m-0 text-xs font-medium text-brand-strong">{formatMinutes(item.durationMinutes)} · {item.method}</p>
                </div>
                <StudySessionButton subject={item.subject} durationMinutes={item.durationMinutes} method={item.method} notes={item.topic} type={item.type} />
              </div>
            ))}
          </div>
        )) : (
          <div className="rounded-2xl border border-dashed border-border-strong p-8 text-sm text-ink-muted sm:col-span-2 lg:col-span-4 2xl:col-span-7">
            Gere seu primeiro plano com as matérias reais que você quer estudar.
          </div>
        )}
      </section>
    </div>
  );
}
