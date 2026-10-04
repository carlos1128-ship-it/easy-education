import { getPrisma } from "@/lib/prisma";

/**
 * Trilha de estudos: etapas em sequência que só liberam com dedicação real.
 * Tudo é calculado a partir do histórico (sessões, quizzes, flashcards, redações);
 * cada etapa só conta o que foi feito depois da etapa anterior, então não dá para pular.
 */

export type TrailNodeKind = "estudo" | "quiz" | "flashcards" | "ofensiva" | "simulado" | "redacao" | "trofeu";
export type TrailStatus = "done" | "current" | "locked";

export type TrailNode = {
  id: string;
  kind: TrailNodeKind;
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

export type Trail = {
  units: TrailUnit[];
  current: TrailNode | null;
  currentUnit: TrailUnit | null;
  doneCount: number;
  streak: number;
  studiedToday: boolean;
};

type Requirement =
  | { kind: "estudo"; minutes: number }
  | { kind: "quiz"; minScore: number }
  | { kind: "flashcards"; count: number }
  | { kind: "ofensiva"; days: number }
  | { kind: "simulado"; minScore: number }
  | { kind: "redacao" }
  | { kind: "trofeu" };

export type TrailHistory = {
  goalMinutes: number;
  includeEssay: boolean;
  sessions: Array<{ date: Date; durationMinutes: number }>;
  quizzes: Array<{ completedAt: Date; score: number; simulado: boolean }>;
  essays: Array<{ createdAt: Date }>;
  flashcardReviews: Date[];
  now?: Date;
};

const UNIT_TITLES = [
  "Primeiros passos",
  "Pegando o ritmo",
  "Constância",
  "Revisão em dia",
  "Mais acertos",
  "Treino de prova",
  "Reta firme",
  "Domínio",
];
const UNITS_PER_SECTION = 4;
const MAX_UNITS = 60;

const pick = <T,>(list: T[], index: number) => list[Math.min(index, list.length - 1)];

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
/** Dia no fuso de Brasília, como número sequencial (para achar dias seguidos). */
function dayNumber(date: Date) {
  const [y, m, d] = dayFormatter.format(date).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function unitRequirements(unit: number, goalMinutes: number, includeEssay: boolean): Requirement[] {
  const minutes = Math.min(goalMinutes, pick([15, 20, 25, 30, 40, 45, 50, 60], unit));
  const quizScore = pick([60, 60, 70, 70, 75, 80, 80, 85, 90], unit);
  const cards = pick([5, 10, 10, 15, 20, 20, 25, 30], unit);
  const streakDays = pick([2, 3, 4, 5, 7, 7, 10, 14], unit);
  const simuladoScore = pick([50, 55, 60, 65, 70, 75], unit);
  const challenge: Requirement =
    unit % 2 === 1 ? { kind: "simulado", minScore: simuladoScore } : includeEssay && unit > 0 ? { kind: "redacao" } : { kind: "quiz", minScore: Math.min(95, quizScore + 10) };

  return [
    unit === 0 ? { kind: "quiz", minScore: 0 } : { kind: "estudo", minutes },
    { kind: "quiz", minScore: quizScore },
    { kind: "flashcards", count: cards },
    { kind: "estudo", minutes },
    { kind: "ofensiva", days: streakDays },
    challenge,
    { kind: "estudo", minutes },
    { kind: "trofeu" },
  ];
}

function describe(req: Requirement, unit: number): Pick<TrailNode, "title" | "hint" | "href"> {
  switch (req.kind) {
    case "estudo":
      return { title: `Estude ${req.minutes} min em um dia`, hint: "Use o plano de estudos ou registre o tempo no cronômetro. Cada etapa de estudo pede um dia diferente.", href: "/dashboard/plano" };
    case "quiz":
      return req.minScore > 0
        ? { title: `Acerte ${req.minScore}% em um quiz`, hint: "Termine um quiz com esse acerto ou mais. Errou? Gere outro e tente de novo.", href: "/dashboard/quizzes" }
        : { title: "Termine seu primeiro quiz", hint: "Gere um quiz da matéria que está estudando e responda até o fim.", href: "/dashboard/quizzes" };
    case "flashcards":
      return { title: `Revise ${req.count} flashcards`, hint: "Abra um deck e responda os cartões. Cada cartão revisado conta.", href: "/dashboard/flashcards" };
    case "ofensiva":
      return { title: `${req.days} dias seguidos de estudo`, hint: "Estude um pouco todos os dias. Se pular um dia, a contagem recomeça.", href: "/dashboard/plano" };
    case "simulado":
      return { title: `Faça ${req.minScore}% em um simulado`, hint: "Termine um simulado com esse acerto ou mais.", href: "/dashboard/simulados" };
    case "redacao":
      return { title: "Corrija uma redação", hint: "Escreva ou mande a foto de uma redação e receba a correção.", href: "/dashboard/redacao" };
    case "trofeu":
      return { title: `Unidade ${unit + 1} concluída`, hint: "Você completou todas as etapas desta unidade.", href: "/dashboard/trilha" };
  }
}

export function buildTrail(history: TrailHistory): Trail {
  const now = history.now ?? new Date();
  const today = dayNumber(now);

  // Atividade por dia: minutos e último horário (quiz concluído também gera sessão).
  const days = new Map<number, { minutes: number; last: number }>();
  const touch = (date: Date, minutes: number) => {
    const key = dayNumber(date);
    const entry = days.get(key) ?? { minutes: 0, last: 0 };
    entry.minutes += minutes;
    entry.last = Math.max(entry.last, date.getTime());
    days.set(key, entry);
  };
  history.sessions.forEach((session) => touch(session.date, session.durationMinutes));
  history.flashcardReviews.forEach((date) => touch(date, 0));
  history.essays.forEach((essay) => touch(essay.createdAt, 0));
  const dayKeys = [...days.keys()].sort((a, b) => a - b);

  const quizzes = [...history.quizzes].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  const essays = history.essays.map((essay) => essay.createdAt.getTime()).sort((a, b) => a - b);
  const reviews = history.flashcardReviews.map((date) => date.getTime()).sort((a, b) => a - b);
  const usedStudyDays = new Set<number>();

  let cursor = 0; // momento em que a etapa anterior foi concluída
  const firstDayAfter = (time: number) => (time ? dayNumber(new Date(time)) : -Infinity);

  function complete(req: Requirement): number | null {
    const fromDay = firstDayAfter(cursor);
    switch (req.kind) {
      case "trofeu":
        return cursor;
      case "estudo": {
        const day = dayKeys.find((key) => key >= fromDay && !usedStudyDays.has(key) && (days.get(key)?.minutes ?? 0) >= req.minutes);
        if (day === undefined) return null;
        usedStudyDays.add(day);
        return Math.max(cursor, days.get(day)!.last);
      }
      case "quiz":
      case "simulado": {
        const quiz = quizzes.find(
          (item) => item.completedAt.getTime() > cursor && item.simulado === (req.kind === "simulado") && item.score >= req.minScore,
        );
        return quiz ? quiz.completedAt.getTime() : null;
      }
      case "flashcards": {
        const after = reviews.filter((time) => time > cursor);
        return after.length >= req.count ? after[req.count - 1] : null;
      }
      case "redacao": {
        const essay = essays.find((time) => time > cursor);
        return essay ?? null;
      }
      case "ofensiva": {
        for (const end of dayKeys) {
          if (end < fromDay) continue;
          let run = 0;
          while (run < req.days && days.has(end - run)) run += 1;
          if (run >= req.days) return Math.max(cursor, days.get(end)!.last);
        }
        return null;
      }
    }
  }

  function currentStreak() {
    let start = days.has(today) ? today : today - 1;
    let run = 0;
    while (days.has(start)) {
      run += 1;
      start -= 1;
    }
    return run;
  }

  function progressFor(req: Requirement): TrailNode["progress"] {
    switch (req.kind) {
      case "estudo": {
        const minutes = usedStudyDays.has(today) ? 0 : (days.get(today)?.minutes ?? 0);
        return { value: Math.min(minutes, req.minutes), target: req.minutes, label: `${Math.min(minutes, req.minutes)} de ${req.minutes} min hoje` };
      }
      case "flashcards": {
        const count = reviews.filter((time) => time > cursor).length;
        return { value: count, target: req.count, label: `${count} de ${req.count} cartões` };
      }
      case "ofensiva": {
        const streak = Math.min(currentStreak(), req.days);
        return { value: streak, target: req.days, label: `${streak} de ${req.days} dias` };
      }
      default:
        return null;
    }
  }

  const units: TrailUnit[] = [];
  let current: TrailNode | null = null;
  let currentUnit: TrailUnit | null = null;
  let doneCount = 0;

  for (let u = 0; u < MAX_UNITS; u += 1) {
    const requirements = unitRequirements(u, Math.max(15, history.goalMinutes), history.includeEssay);
    const unit: TrailUnit = {
      index: u,
      section: Math.floor(u / UNITS_PER_SECTION) + 1,
      title: UNIT_TITLES[u] ?? `Unidade ${u + 1}`,
      status: "locked",
      nodes: [],
    };

    requirements.forEach((req, n) => {
      const text = describe(req, u);
      const node: TrailNode = { id: `${u}-${n}`, kind: req.kind, ...text, status: "locked", completedAt: null, progress: null };
      if (!current) {
        const doneAt = complete(req);
        if (doneAt !== null) {
          cursor = doneAt;
          node.status = "done";
          node.completedAt = doneAt ? new Date(doneAt).toISOString() : null;
          doneCount += 1;
        } else {
          node.status = "current";
          node.progress = progressFor(req);
          current = node;
          currentUnit = unit;
        }
      }
      unit.nodes.push(node);
    });

    unit.status = unit.nodes.every((node) => node.status === "done") ? "done" : unit === currentUnit ? "current" : "locked";
    units.push(unit);
    // Mostra a unidade atual e a próxima, ainda bloqueada.
    if (currentUnit && u > (currentUnit as TrailUnit).index) break;
  }

  return { units, current, currentUnit, doneCount, streak: currentStreak(), studiedToday: days.has(today) };
}

const ESSAY_GOALS = ["enem", "vestibular", "provas escolares"];

export async function getTrailForUser(userId: string) {
  const prisma = getPrisma();
  const [profile, sessions, quizzes, essays, cards] = await Promise.all([
    prisma.profile.findUnique({ where: { userId }, select: { dailyMinutes: true, studyGoal: true } }),
    prisma.studySession.findMany({ where: { userId }, select: { date: true, durationMinutes: true }, orderBy: { date: "desc" }, take: 3000 }),
    prisma.quiz.findMany({
      where: { userId, completedAt: { not: null }, score: { not: null } },
      select: { completedAt: true, score: true, difficulty: true },
      orderBy: { completedAt: "desc" },
      take: 2000,
    }),
    prisma.essay.findMany({ where: { userId, score: { not: null } }, select: { createdAt: true }, take: 500 }),
    prisma.flashcard.findMany({
      where: { deck: { userId }, repetitions: { gt: 0 } },
      select: { nextReview: true, interval: true },
      take: 5000,
    }),
  ]);

  const goal = profile?.studyGoal?.toLowerCase() ?? "";
  return buildTrail({
    goalMinutes: profile?.dailyMinutes ?? 60,
    includeEssay: ESSAY_GOALS.some((item) => goal.includes(item)),
    sessions,
    quizzes: quizzes.map((quiz) => ({ completedAt: quiz.completedAt!, score: quiz.score!, simulado: quiz.difficulty === "simulado" })),
    essays,
    // A revisão não guarda data; a última fica em "próxima revisão − intervalo".
    flashcardReviews: cards.map((card) => new Date(card.nextReview.getTime() - card.interval * 86_400_000)),
  });
}
