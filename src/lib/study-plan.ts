import type { GeneratedStudyPlan, StudyPlanBlock } from "@/types";

const dayLabels: Record<string, string> = {
  sunday: "Dom",
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sab",
};

export function parseStudyPlan(value: unknown): GeneratedStudyPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as GeneratedStudyPlan;
  if (!Array.isArray(plan.days)) return null;
  return plan;
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Sao_Paulo" });

/** Dia da semana de hoje no horário de Brasília ("monday"...). O servidor roda em UTC. */
export function todayWeekday(now: Date = new Date()) {
  return weekdayFormat.format(now).toLowerCase();
}

/** Blocos de hoje. Dia sem bloco no plano é dia de descanso (não puxa os blocos de outro dia). */
export function getTodayPlanBlocks(plan: GeneratedStudyPlan | null, now: Date = new Date()): StudyPlanBlock[] {
  if (!plan) return [];
  const today = todayWeekday(now);
  return plan.days.find((day) => day.dayOfWeek.toLowerCase() === today)?.blocks ?? [];
}

export function getDayLabel(dayOfWeek: string) {
  return dayLabels[dayOfWeek.toLowerCase()] ?? dayOfWeek.slice(0, 3);
}
