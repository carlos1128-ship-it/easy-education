import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { dayKeySP } from "@/lib/study-completion";
import { calculateStreak } from "@/lib/study-stats";
import { startOfDaySP } from "@/lib/time-window";
import { MAX_MINUTES_XP_PER_DAY, XP_RULES, levelFor, levelTitle, xpFor, type LevelInfo } from "@/lib/xp";

/**
 * XP, nível, ofensiva e XP da semana do aluno, calculados do histórico (nada novo é gravado).
 * Aparece no topo do app (celular e computador) e no Início.
 */

export type Gamification = LevelInfo & {
  title: string;
  streak: number;
  todayXp: number;
  /** Meta diária de XP (a barra do dia enche quando chega nela). */
  dailyGoalXp: number;
  /** Últimos 7 dias (o último é hoje), com rótulo curto. */
  week: Array<{ day: string; label: string; xp: number }>;
};

export const DAILY_GOAL_XP = 50;
const DAY_MS = 86_400_000;
const weekdayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" });

type DayRow = { day: Date; minutes: number };

export const getGamification = cache(async (userId: string): Promise<Gamification> => {
  const prisma = getPrisma();
  const weekStart = new Date(startOfDaySP().getTime() - 6 * DAY_MS);
  const [quizAnswers, bankAnswers, cards, reviews, blocks, summaries, essays, minutesByDay, recentQuizzes, recentBank, recentRuns, recentSummaries, recentEssays, recentCards, sessionDates] = await Promise.all([
    prisma.quizQuestion.groupBy({ by: ["isCorrect"], where: { quiz: { userId }, isCorrect: { not: null } }, _count: { _all: true } }),
    prisma.bankAnswer.groupBy({ by: ["isCorrect"], where: { userId }, _count: { _all: true } }),
    prisma.flashcard.aggregate({ where: { deck: { userId } }, _sum: { repetitions: true } }),
    prisma.questionReview.aggregate({ where: { userId }, _sum: { repetitions: true } }),
    prisma.studyBlockRun.count({ where: { userId, status: "concluido" } }),
    prisma.daySummary.count({ where: { userId, feedback: { not: undefined } } }),
    prisma.essay.count({ where: { userId, score: { not: null } } }),
    prisma.$queryRaw<DayRow[]>`SELECT date_trunc('day', "date" AT TIME ZONE 'America/Sao_Paulo') AS day, SUM("duration_minutes")::int AS minutes FROM "study_sessions" WHERE "user_id" = ${userId} GROUP BY 1`,
    prisma.quiz.findMany({ where: { userId, completedAt: { gte: weekStart } }, select: { completedAt: true, questions: { select: { isCorrect: true } } } }),
    prisma.bankAnswer.findMany({ where: { userId, answeredAt: { gte: weekStart } }, select: { answeredAt: true, isCorrect: true } }),
    prisma.studyBlockRun.findMany({ where: { userId, status: "concluido", completedAt: { gte: weekStart } }, select: { completedAt: true } }),
    prisma.daySummary.findMany({ where: { userId, createdAt: { gte: weekStart } }, select: { createdAt: true } }),
    prisma.essay.findMany({ where: { userId, score: { not: null }, createdAt: { gte: weekStart } }, select: { createdAt: true } }),
    prisma.flashcard.findMany({ where: { deck: { userId }, lastReviewedAt: { gte: weekStart } }, select: { lastReviewedAt: true } }),
    prisma.studySession.findMany({ where: { userId }, select: { date: true }, orderBy: { date: "desc" }, take: 400 }),
  ]);

  const count = (rows: Array<{ isCorrect: boolean | null; _count: { _all: number } }>, value: boolean) => rows.find((row) => row.isCorrect === value)?._count._all ?? 0;
  const cappedMinutes = minutesByDay.reduce((sum, row) => sum + Math.min(MAX_MINUTES_XP_PER_DAY, Number(row.minutes) || 0), 0);
  const total = xpFor({
    correct: count(quizAnswers, true) + count(bankAnswers, true),
    wrong: count(quizAnswers, false) + count(bankAnswers, false),
    cards: (cards._sum.repetitions ?? 0) + (reviews._sum.repetitions ?? 0),
    blocks,
    daySummaries: summaries,
    essays,
    minutes: cappedMinutes,
  });

  // XP de cada um dos últimos 7 dias (horário de Brasília).
  const days = Array.from({ length: 7 }, (_, index) => dayKeySP(new Date(weekStart.getTime() + index * DAY_MS + 12 * 3_600_000)));
  const byDay = new Map(days.map((day) => [day, 0]));
  const add = (date: Date | null | undefined, xp: number) => {
    if (!date) return;
    const key = dayKeySP(date);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + xp);
  };
  for (const quiz of recentQuizzes) {
    const correct = quiz.questions.filter((question) => question.isCorrect).length;
    add(quiz.completedAt, xpFor({ correct, wrong: quiz.questions.length - correct }));
  }
  for (const answer of recentBank) add(answer.answeredAt, answer.isCorrect ? XP_RULES.correct : XP_RULES.wrong);
  for (const run of recentRuns) add(run.completedAt, XP_RULES.block);
  for (const summary of recentSummaries) add(summary.createdAt, XP_RULES.daySummary);
  for (const essay of recentEssays) add(essay.createdAt, XP_RULES.essay);
  for (const card of recentCards) add(card.lastReviewedAt, XP_RULES.card);
  for (const row of minutesByDay) {
    const key = dayKeySP(new Date(new Date(row.day).getTime() + 15 * 3_600_000));
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Math.min(MAX_MINUTES_XP_PER_DAY, Number(row.minutes) || 0));
  }

  const week = days.map((day) => ({ day, label: weekdayFormat.format(new Date(`${day}T15:00:00Z`)).replace(".", ""), xp: byDay.get(day) ?? 0 }));
  const level = levelFor(total);
  const activeDates = [
    ...sessionDates.map((session) => session.date),
    ...recentQuizzes.map((quiz) => quiz.completedAt).filter((date): date is Date => Boolean(date)),
    ...recentBank.map((answer) => answer.answeredAt),
  ];
  return {
    ...level,
    title: levelTitle(level.level),
    streak: calculateStreak(activeDates),
    todayXp: week.at(-1)?.xp ?? 0,
    dailyGoalXp: DAILY_GOAL_XP,
    week,
  };
});
