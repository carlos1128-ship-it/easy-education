import type { GeneratedStudyPlan, StudyPlanBlock } from "@/types";

const dayLabels: Record<string, string> = {
  sunday: "Dom",
  monday: "Seg",
  tuesday: "Ter",
  wednesday: "Qua",
  thursday: "Qui",
  friday: "Sex",
  saturday: "Sáb",
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

const WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Quantos dias faltam de hoje até `dayOfWeek` (0 = hoje, 6 = daqui a 6 dias), no horário de Brasília. */
export function daysFromToday(dayOfWeek: string, now: Date = new Date()) {
  const target = WEEK.indexOf(dayOfWeek.toLowerCase());
  if (target < 0) return 7;
  return (target - WEEK.indexOf(todayWeekday(now)) + 7) % 7;
}

/**
 * Dias do plano com hoje primeiro e os seguintes na ordem (sexta, sábado, domingo... até quinta).
 * Dia com nome desconhecido vai para o fim, sem sumir.
 */
export function orderWeekFromToday<T extends { dayOfWeek: string }>(days: readonly T[], now: Date = new Date()): T[] {
  return days
    .map((day, index) => ({ day, index, offset: daysFromToday(day.dayOfWeek, now) }))
    .sort((a, b) => a.offset - b.offset || a.index - b.index)
    .map((item) => item.day);
}

/** "Hoje", "Amanhã" ou o nome curto do dia. */
export function relativeDayLabel(dayOfWeek: string, now: Date = new Date()) {
  const offset = daysFromToday(dayOfWeek, now);
  if (offset === 0) return "Hoje";
  if (offset === 1) return "Amanhã";
  return getDayLabel(dayOfWeek);
}

export function getDayLabel(dayOfWeek: string) {
  return dayLabels[dayOfWeek.toLowerCase()] ?? dayOfWeek.slice(0, 3);
}
