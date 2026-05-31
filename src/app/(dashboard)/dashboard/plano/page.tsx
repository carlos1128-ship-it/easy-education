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
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_320px]">
      <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[#4F46E5]">Plano de Estudo</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Plano semanal</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#EEF2FF] px-3 py-2 text-sm font-bold text-[#4F46E5]">
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

        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {plan?.days.length ? plan.days.map((day) => (
            <div key={day.dayOfWeek} className="min-h-80 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="font-bold text-[#0F172A]">{getDayLabel(day.dayOfWeek)}</p>
              <div className="mt-4 space-y-3">
                {day.blocks.map((item, index) => (
                  <div key={`${day.dayOfWeek}-${item.subject}-${item.topic}-${index}`} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                    <p className="font-bold text-[#0F172A]">{item.subject}</p>
                    <p className="mt-1 text-[#64748B]">{item.topic}</p>
                    <p className="mt-1 text-xs font-semibold text-[#4F46E5]">{formatMinutes(item.durationMinutes)} · {item.method}</p>
                    <div className="mt-3">
                      <StudySessionButton subject={item.subject} durationMinutes={item.durationMinutes} method={item.method} notes={item.topic} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-8 text-sm text-[#64748B] md:col-span-7">
              Gere seu primeiro plano com as materias reais que voce quer estudar.
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
          <CalendarCheck className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#0F172A]">Resumo das metas</h2>
        <ul className="mt-5 space-y-3 text-sm text-[#64748B]">
          <li>{formatMinutes(plannedMinutes)} planejados</li>
          <li>{subjectCount} materias ativas</li>
          <li>{simulatedCount} simulados na semana</li>
          <li>{plan?.weeklyGoals.length ?? 0} metas semanais</li>
        </ul>
        {plan?.tips.length ? (
          <div className="mt-6 rounded-xl bg-[#F8FAFC] p-4">
            <p className="text-sm font-bold text-[#0F172A]">Dica da IA</p>
            <p className="mt-2 text-sm text-[#64748B]">{plan.tips[0]}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
