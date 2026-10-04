import { promotions } from "@/content/notifications";
import { formatMinutes } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";
import { calculateStreak, startOfToday, startOfWindow } from "@/lib/study-stats";

export type NotificationTone = "brand" | "warning" | "success";

export type AppNotification = {
  /** Estável por dia: o aluno marca como lida e ela não volta até mudar. */
  id: string;
  kind: "ofensiva" | "meta" | "revisao" | "quiz" | "simulado" | "promocao";
  title: string;
  body: string;
  href?: string;
  tone: NotificationTone;
};

/** Notificações calculadas a partir dos dados reais do aluno (nada é inventado). */
export async function getNotificationsForUser(userId: string): Promise<AppNotification[]> {
  const prisma = getPrisma();
  const today = startOfToday();
  const dayKey = today.toISOString().slice(0, 10);

  const [profile, sessions, completedQuizzes, dueCards, pendingQuizzes, newSimulado] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { dailyMinutes: true } }),
    prisma.studySession.findMany({ where: { userId, date: { gte: startOfWindow(60) } }, select: { date: true, durationMinutes: true } }),
    prisma.quiz.findMany({
      where: { userId, score: { not: null }, createdAt: { gte: startOfWindow(60) } },
      select: { completedAt: true, createdAt: true },
    }),
    prisma.flashcard.count({ where: { deck: { userId }, nextReview: { lte: new Date() } } }),
    prisma.quiz.count({ where: { userId, score: null, difficulty: { not: "simulado" } } }),
    prisma.quiz.findFirst({
      where: { userId, difficulty: "simulado", score: null, createdAt: { gte: startOfWindow(7) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true },
    }),
  ]);

  const notifications: AppNotification[] = [];
  const streak = calculateStreak([...sessions.map((s) => s.date), ...completedQuizzes.map((q) => q.completedAt ?? q.createdAt)]);
  const todayMinutes = sessions.filter((s) => s.date >= today).reduce((sum, s) => sum + s.durationMinutes, 0);
  const goal = profile?.dailyMinutes ?? 60;

  notifications.push(
    streak > 0
      ? {
          id: `ofensiva-${dayKey}-${streak}`,
          kind: "ofensiva",
          title: `Ofensiva de ${streak} ${streak === 1 ? "dia" : "dias"}`,
          body: todayMinutes > 0 ? "Você já estudou hoje. Continue amanhã para manter a sequência." : "Estude hoje para não perder a sequência.",
          href: "/dashboard/plano",
          tone: todayMinutes > 0 ? "success" : "warning",
        }
      : {
          id: `ofensiva-${dayKey}-0`,
          kind: "ofensiva",
          title: "Comece sua ofensiva hoje",
          body: "Registre um estudo ou conclua um quiz para iniciar a sequência de dias.",
          href: "/dashboard/plano",
          tone: "brand",
        },
  );

  if (todayMinutes < goal) {
    notifications.push({
      id: `meta-${dayKey}`,
      kind: "meta",
      title: `Faltam ${formatMinutes(goal - todayMinutes)} para a meta de hoje`,
      body: `Sua meta diária é ${formatMinutes(goal)}. Hoje você estudou ${todayMinutes > 0 ? formatMinutes(todayMinutes) : "0 min"}.`,
      href: "/dashboard/plano",
      tone: "brand",
    });
  } else {
    notifications.push({
      id: `meta-${dayKey}-ok`,
      kind: "meta",
      title: "Meta de hoje cumprida",
      body: `Você estudou ${formatMinutes(todayMinutes)} hoje.`,
      tone: "success",
    });
  }

  if (dueCards > 0) {
    notifications.push({
      id: `revisao-${dayKey}-${dueCards}`,
      kind: "revisao",
      title: `${dueCards} ${dueCards === 1 ? "flashcard para revisar" : "flashcards para revisar"} hoje`,
      body: "A revisão espaçada separou o que você está quase esquecendo.",
      href: "/dashboard/flashcards",
      tone: "warning",
    });
  }

  if (newSimulado) {
    notifications.push({
      id: `simulado-${newSimulado.id}`,
      kind: "simulado",
      title: "Simulado da semana pronto",
      body: newSimulado.title,
      href: `/dashboard/simulados/${newSimulado.id}`,
      tone: "brand",
    });
  }

  if (pendingQuizzes > 0) {
    notifications.push({
      id: `quiz-${dayKey}-${pendingQuizzes}`,
      kind: "quiz",
      title: `${pendingQuizzes} ${pendingQuizzes === 1 ? "quiz não terminado" : "quizzes não terminados"}`,
      body: "Termine para ver seu acerto por matéria.",
      href: "/dashboard/quizzes",
      tone: "brand",
    });
  }

  for (const promo of promotions) {
    if (promo.until && new Date(`${promo.until}T23:59:59`) < new Date()) continue;
    notifications.push({ id: `promo-${promo.id}`, kind: "promocao", title: promo.title, body: promo.body, href: promo.href, tone: "brand" });
  }

  return notifications;
}
