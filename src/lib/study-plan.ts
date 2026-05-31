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

export function getTodayPlanBlocks(plan: GeneratedStudyPlan | null): StudyPlanBlock[] {
  if (!plan) return [];
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase();
  return plan.days.find((day) => day.dayOfWeek.toLowerCase() === today)?.blocks ?? plan.days[0]?.blocks ?? [];
}

export function getDayLabel(dayOfWeek: string) {
  return dayLabels[dayOfWeek.toLowerCase()] ?? dayOfWeek.slice(0, 3);
}
