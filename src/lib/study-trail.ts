import { getPrisma } from "@/lib/prisma";
import { parseStudyPlan } from "@/lib/study-plan";
import type { GeneratedStudyPlan, StudyPlanBlock } from "@/types";

/**
 * Trilha de estudos ligada ao plano semanal: cada dia concluído do plano vale um nível.
 * São 9 seções de 7 dias (63 níveis). Cada seção concluída dá um troféu; depois da última
 * a trilha recomeça e os troféus ficam guardados. Tudo sai do histórico (sessões, quizzes,
 * flashcards, redações), sem tabela nova.
 */

export type TrailNodeKind = "dia" | "trofeu";
export type TrailStatus = "done" | "current" | "locked";

export type TrailNode = {
  id: string;
  kind: TrailNodeKind;
  /** Nível dentro do ciclo, de 1 a 63 (troféu: 0) */
  level: number;
  title: string;
  hint: string;
  href: string;
  status: TrailStatus;
  completedAt: string | null;
  progress: { value: number; target: number; label: string } | null;
};

export type TrailUnit = {
  index: number;
  section: number;
  title: string;
  status: TrailStatus;
  nodes: TrailNode[];
};

export type TrailTrophy = {
  section: number;
  name: string;
  sectionTitle: string;
  /** Quantas vezes já foi conquistado (um por ciclo completo) */
  earned: number;
  firstEarnedAt: string | null;
};

export type Trail = {
  units: TrailUnit[];
  current: TrailNode | null;
  currentUnit: TrailUnit | null;
  /** Níveis concluídos no ciclo atual */
  doneCount: number;
  /** Dias concluídos no total, somando todos os ciclos */
  totalDays: number;
  cycle: number;
  streak: number;
  studiedToday: boolean;
  todayDone: boolean;
  trophies: TrailTrophy[];
};

export type TrailHistory = {
  goalMinutes: number;
  plan: GeneratedStudyPlan | null;
  sessions: Array<{ date: Date; durationMinutes: number }>;
  quizzes: Array<{ completedAt: Date; simulado: boolean }>;
  essays: Array<{ createdAt: Date }>;
  flashcardReviews: Date[];
  now?: Date;
};

export const DAYS_PER_SECTION = 7;
export const SECTION_COUNT = 9;
const CYCLE = DAYS_PER_SECTION * SECTION_COUNT;
const MIN_MINUTES = 15;
const REVIEW_CARDS = 10;

const SECTIONS = [
  { title: "Primeiros passos", trophy: "Bronze" },
  { title: "Pegando o ritmo", trophy: "Prata" },
  { title: "Constância", trophy: "Ouro" },
  { title: "Revisão em dia", trophy: "Esmeralda" },
  { title: "Mais acertos", trophy: "Safira" },
  { title: "Treino de prova", trophy: "Rubi" },
  { title: "Reta firme", trophy: "Ametista" },
  { title: "Domínio", trophy: "Diamante" },
  { title: "Mestre dos estudos", trophy: "Lendário" },
];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_LABELS: Record<string, string> = {
  sunday: "Domingo",
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
};
const TYPE_LABELS: Record<StudyPlanBlock["type"], string> = { estudo: "Estudo", revisao: "Revisão", simulado: "Simulado", redacao: "Redação" };

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
/** Dia no fuso de Brasília, como número sequencial. */
function dayNumber(date: Date) {
  const [y, m, d] = dayFormatter.format(date).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}
/** Dia da semana (sunday…saturday) de um número de dia. */
const weekdayOf = (day: number) => WEEKDAYS[(((day + 4) % 7) + 7) % 7];
const dateOf = (day: number) => new Date(day * 86_400_000 + 15 * 3_600_000).toISOString();

function planBlocks(plan: GeneratedStudyPlan | null, weekday: string) {
  return plan?.days.find((day) => day.dayOfWeek.toLowerCase() === weekday)?.blocks ?? [];
}

export function buildTrail(history: TrailHistory): Trail {
  const today = dayNumber(history.now ?? new Date());
  const goal = Math.max(MIN_MINUTES, history.goalMinutes);

  type DayActivity = { minutes: number; quiz: number; simulado: number; essay: number; cards: number };
  const days = new Map<number, DayActivity>();
  const at = (date: Date) => {
    const key = dayNumber(date);
    let entry = days.get(key);
    if (!entry) days.set(key, (entry = { minutes: 0, quiz: 0, simulado: 0, essay: 0, cards: 0 }));
    return entry;
  };
  history.sessions.forEach((session) => (at(session.date).minutes += session.durationMinutes));
  history.quizzes.forEach((quiz) => (quiz.simulado ? at(quiz.completedAt).simulado++ : at(quiz.completedAt).quiz++));
  history.essays.forEach((essay) => at(essay.createdAt).essay++);
  history.flashcardReviews.forEach((date) => at(date).cards++);

  const targetMinutes = (weekday: string) => {
    const planned = planBlocks(history.plan, weekday).reduce((sum, block) => sum + (block.durationMinutes || 0), 0);
    return Math.max(MIN_MINUTES, Math.min(goal, planned || goal));
  };

  /** Dia concluído: fez a atividade que o plano pede para aquele dia ou estudou os minutos planejados. */
  function isDone(day: number) {
    const activity = days.get(day);
    if (!activity) return false;
    const weekday = weekdayOf(day);
    if (activity.minutes >= targetMinutes(weekday)) return true;
    const types = new Set(planBlocks(history.plan, weekday).map((block) => block.type));
    if (!types.size) types.add("estudo");
    return (
      (types.has("estudo") && activity.quiz > 0) ||
      (types.has("revisao") && activity.cards >= REVIEW_CARDS) ||
      (types.has("simulado") && activity.simulado > 0) ||
      (types.has("redacao") && activity.essay > 0)
    );
  }

  const doneDays = [...days.keys()].filter(isDone).sort((a, b) => a - b);
  const totalDays = doneDays.length;
  const todayDone = doneDays.at(-1) === today;
  const cycleStart = totalDays - (totalDays % CYCLE);
  const doneCount = totalDays % CYCLE;
  const cycle = Math.floor(totalDays / CYCLE) + 1;

  let streak = 0;
  for (let day = days.has(today) ? today : today - 1; days.has(day); day -= 1) streak += 1;

  // Dia de hoje: o que o plano pede e quanto já foi feito.
  const todayWeekday = weekdayOf(today);
  const todayBlocks = planBlocks(history.plan, todayWeekday);
  const todayTarget = targetMinutes(todayWeekday);
  const todayMinutes = Math.min(days.get(today)?.minutes ?? 0, todayTarget);
  const todayPlan = todayBlocks.length
    ? todayBlocks.map((block) => `${TYPE_LABELS[block.type] ?? "Estudo"} de ${block.subject}`).join(" + ")
    : `Estude ${todayTarget} min`;

  const units: TrailUnit[] = [];
  let current: TrailNode | null = null;
  let currentUnit: TrailUnit | null = null;

  for (let s = 0; s < SECTION_COUNT; s += 1) {
    const unit: TrailUnit = { index: s, section: s + 1, title: SECTIONS[s].title, status: "locked", nodes: [] };
    for (let d = 0; d < DAYS_PER_SECTION; d += 1) {
      const position = s * DAYS_PER_SECTION + d; // 0-based dentro do ciclo
      const level = position + 1;
      const node: TrailNode = {
        id: `${s}-${d}`,
        kind: "dia",
        level,
        title: `Nível ${level}`,
        hint: "Conclua os dias anteriores para chegar aqui.",
        href: "/dashboard/plano",
        status: "locked",
        completedAt: null,
        progress: null,
      };
      if (position < doneCount) {
        const day = doneDays[cycleStart + position];
        node.status = "done";
        node.completedAt = dateOf(day);
        node.hint = day === today ? "Dia de hoje concluído. Volte amanhã para o próximo nível." : "Dia concluído.";
      } else if (position === doneCount && !todayDone) {
        node.status = "current";
        node.title = `Nível ${level} · Hoje`;
        node.hint = `${WEEKDAY_LABELS[todayWeekday]}: ${todayPlan}. Faça a atividade do plano ou estude ${todayTarget} min para passar de nível.`;
        node.progress = { value: todayMinutes, target: todayTarget, label: `${todayMinutes} de ${todayTarget} min hoje` };
        current = node;
        currentUnit = unit;
      } else if (position === doneCount) {
        node.hint = "Libera amanhã, com o próximo dia do plano.";
      }
      unit.nodes.push(node);
    }
    const sectionDone = doneCount >= (s + 1) * DAYS_PER_SECTION;
    unit.nodes.push({
      id: `${s}-trofeu`,
      kind: "trofeu",
      level: 0,
      title: `Troféu ${SECTIONS[s].trophy}`,
      hint: sectionDone ? "Conquistado! Ele já está na sala de troféus." : `Conclua os 7 dias da seção ${s + 1} para ganhar.`,
      href: "/dashboard/trilha/trofeus",
      status: sectionDone ? "done" : "locked",
      completedAt: sectionDone ? dateOf(doneDays[cycleStart + (s + 1) * DAYS_PER_SECTION - 1]) : null,
      progress: null,
    });
    unit.status = sectionDone ? "done" : doneCount >= s * DAYS_PER_SECTION ? "current" : "locked";
    units.push(unit);
  }
  if (!currentUnit) currentUnit = units.find((unit) => unit.status === "current") ?? null;

  const fullCycles = Math.floor(totalDays / CYCLE);
  const trophies: TrailTrophy[] = SECTIONS.map((section, s) => {
    const needed = (s + 1) * DAYS_PER_SECTION;
    const earned = fullCycles + (doneCount >= needed ? 1 : 0);
    return {
      section: s + 1,
      name: section.trophy,
      sectionTitle: section.title,
      earned,
      firstEarnedAt: earned ? dateOf(doneDays[needed - 1]) : null,
    };
  });

  return { units, current, currentUnit, doneCount, totalDays, cycle, streak, studiedToday: days.has(today), todayDone, trophies };
}

export async function getTrailForUser(userId: string) {
  const prisma = getPrisma();
  const [profile, plan, sessions, quizzes, essays, cards] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { dailyMinutes: true } }),
    prisma.studyPlan.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { planData: true } }),
    prisma.studySession.findMany({ where: { userId }, select: { date: true, durationMinutes: true }, orderBy: { date: "desc" }, take: 5000 }),
    prisma.quiz.findMany({
      where: { userId, completedAt: { not: null } },
      select: { completedAt: true, difficulty: true },
      orderBy: { completedAt: "desc" },
      take: 3000,
    }),
    prisma.essay.findMany({ where: { userId, score: { not: null } }, select: { createdAt: true }, take: 1000 }),
    prisma.flashcard.findMany({
      where: { deck: { userId }, repetitions: { gt: 0 } },
      select: { nextReview: true, interval: true },
      take: 5000,
    }),
  ]);

  return buildTrail({
    goalMinutes: profile?.dailyMinutes ?? 60,
    plan: parseStudyPlan(plan?.planData),
    sessions,
    quizzes: quizzes.map((quiz) => ({ completedAt: quiz.completedAt!, simulado: quiz.difficulty === "simulado" })),
    essays,
    // A revisão não guarda data; a última fica em "próxima revisão − intervalo".
    flashcardReviews: cards.map((card) => new Date(card.nextReview.getTime() - card.interval * 86_400_000)),
  });
}
