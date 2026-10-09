import type { Prisma } from "@prisma/client";
import {
  ANSWER_FILTERS,
  DIFFICULTIES,
  ENEM_AREAS,
  ORIGIN,
  REPORT_KINDS,
  SEED_EXAMS,
  SEED_SUBJECTS,
  slugify,
  type AnswerFilter,
  type ReportKind,
  type SessionKind,
} from "@/lib/bank/constants";
import { estimateAreaScore, estimateOverallScore, percent } from "@/lib/bank/estimate";
import type { BankOption } from "@/lib/bank/import";
import { aiStyleNote, isAiQuestion, sourceLabel } from "@/lib/bank/labels";
import { nextSchedule, type ReviewGrade } from "@/lib/bank/spaced";
import { getPrisma } from "@/lib/prisma";

export class BankError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "BankError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------------------------
// Catálogo (exames, matérias, assuntos)
// ---------------------------------------------------------------------------------------------

/** Garante os exames e as matérias iniciais. Pode rodar quantas vezes quiser. */
export async function ensureCatalog() {
  const prisma = getPrisma();
  for (const exam of SEED_EXAMS) {
    await prisma.exam.upsert({ where: { slug: exam.slug }, update: {}, create: { ...exam } });
  }
  for (const subject of SEED_SUBJECTS) {
    await prisma.bankSubject.upsert({ where: { slug: subject.slug }, update: {}, create: { ...subject } });
  }
}

/** Acha (ou cria) o assunto dentro da matéria. O nome é normalizado para não duplicar variações. */
export async function upsertTopic(subjectId: string, rawName: string) {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 80);
  const slug = slugify(name);
  if (!slug) return null;
  const prisma = getPrisma();
  return prisma.bankTopic.upsert({
    where: { subjectId_slug: { subjectId, slug } },
    update: {},
    create: { subjectId, slug, name: name.charAt(0).toUpperCase() + name.slice(1) },
  });
}

// ---------------------------------------------------------------------------------------------
// Visibilidade e filtros
// ---------------------------------------------------------------------------------------------

/** O aluno vê as questões publicadas de prova e as questões de IA que ele mesmo pediu. */
export function visibleWhere(userId: string): Prisma.BankQuestionWhereInput {
  return {
    isPublished: true,
    OR: [{ origin: ORIGIN.official }, { origin: ORIGIN.ai, ownerUserId: userId }],
  };
}

export type BankFilters = {
  exam?: string;
  year?: number;
  area?: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
  status?: AnswerFilter;
  origin?: string;
};

/** Lê os filtros da URL (?exame=enem&ano=2022...). Valores inválidos são ignorados. */
export function parseFilters(params: Record<string, string | string[] | undefined>): BankFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const year = Number(one("ano"));
  const status = one("status") as AnswerFilter | undefined;
  const difficulty = one("dificuldade");
  const origin = one("origem");
  return {
    exam: one("exame"),
    year: Number.isInteger(year) && year > 1900 && year < 2200 ? year : undefined,
    area: one("area"),
    subject: one("materia"),
    topic: one("assunto"),
    difficulty: (DIFFICULTIES as readonly string[]).includes(difficulty ?? "") ? difficulty : undefined,
    status: status && (ANSWER_FILTERS as readonly string[]).includes(status) ? status : undefined,
    origin: origin === ORIGIN.official || origin === ORIGIN.ai ? origin : undefined,
  };
}

export function buildWhere(userId: string, filters: BankFilters): Prisma.BankQuestionWhereInput {
  const and: Prisma.BankQuestionWhereInput[] = [visibleWhere(userId)];
  if (filters.exam) and.push({ exam: { slug: filters.exam } });
  if (filters.year) and.push({ year: filters.year });
  if (filters.area) and.push({ area: filters.area });
  if (filters.subject) and.push({ subject: { slug: filters.subject } });
  if (filters.topic) and.push({ topic: { slug: filters.topic } });
  if (filters.difficulty) and.push({ difficulty: filters.difficulty });
  if (filters.origin) and.push({ origin: filters.origin });
  if (filters.status === "nao_respondidas") and.push({ answers: { none: { userId } } });
  if (filters.status === "erradas") and.push({ answers: { some: { userId, isCorrect: false } } });
  if (filters.status === "marcadas") and.push({ bookmarks: { some: { userId } } });
  return { AND: and };
}

const questionInclude = {
  exam: { select: { name: true, styleLabel: true, slug: true } },
  subject: { select: { name: true, slug: true } },
  topic: { select: { name: true, slug: true } },
} satisfies Prisma.BankQuestionInclude;

type QuestionRow = Prisma.BankQuestionGetPayload<{ include: typeof questionInclude }>;

/** A questão como o navegador vê: sem gabarito e sem resolução (isso só sai depois de responder). */
export type ClientQuestion = {
  id: string;
  source: string;
  isAi: boolean;
  aiNote: string | null;
  area: string | null;
  areaName: string | null;
  subjectName: string | null;
  topicName: string | null;
  difficulty: string | null;
  supportText: string | null;
  statement: string;
  images: string[];
  options: BankOption[];
  bookmarked: boolean;
  reviewStatus: string;
};

export type Reveal = { correctLabel: string; explanation: string | null; reviewStatus: string };

function parseOptions(value: Prisma.JsonValue): BankOption[] {
  return Array.isArray(value)
    ? (value as Array<Record<string, unknown>>).map((item) => ({
        label: String(item.label ?? ""),
        text: String(item.text ?? ""),
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : null,
      }))
    : [];
}

function parseImages(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function toClientQuestion(row: QuestionRow, bookmarked = false): ClientQuestion {
  return {
    id: row.id,
    source: sourceLabel({ ...row, exam: row.exam }),
    isAi: isAiQuestion(row),
    aiNote: isAiQuestion(row) ? aiStyleNote(row) : null,
    area: row.area,
    areaName: row.area ? (ENEM_AREAS[row.area] ?? row.area) : null,
    subjectName: row.subject?.name ?? null,
    topicName: row.topic?.name ?? null,
    difficulty: row.difficulty,
    supportText: row.supportText,
    statement: row.statement,
    images: parseImages(row.images),
    options: parseOptions(row.options),
    bookmarked,
    reviewStatus: row.reviewStatus,
  };
}

export function toReveal(row: Pick<QuestionRow, "correctLabel" | "explanation" | "reviewStatus">): Reveal {
  return { correctLabel: row.correctLabel, explanation: row.explanation, reviewStatus: row.reviewStatus };
}

// ---------------------------------------------------------------------------------------------
// Listagem e filtros da tela
// ---------------------------------------------------------------------------------------------

export type FilterOptions = {
  exams: Array<{ slug: string; name: string }>;
  years: number[];
  areas: Array<{ slug: string; name: string }>;
  subjects: Array<{ slug: string; name: string; topics: Array<{ slug: string; name: string }> }>;
};

/** Só mostra opções que têm pelo menos uma questão publicada (nada de filtro que leva a lista vazia). */
export async function getFilterOptions(userId: string): Promise<FilterOptions> {
  const prisma = getPrisma();
  const visible = visibleWhere(userId);
  const [exams, years, areas, subjects] = await Promise.all([
    prisma.exam.findMany({ where: { active: true, questions: { some: visible } }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.bankQuestion.findMany({ where: { ...visible, origin: ORIGIN.official }, distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } }),
    prisma.bankQuestion.findMany({ where: { ...visible, area: { not: null } }, distinct: ["area"], select: { area: true } }),
    prisma.bankSubject.findMany({
      where: { questions: { some: visible } },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, topics: { where: { questions: { some: visible } }, orderBy: { name: "asc" }, select: { slug: true, name: true } } },
    }),
  ]);
  return {
    exams,
    years: years.map((item) => item.year),
    areas: areas.flatMap((item) => (item.area ? [{ slug: item.area, name: ENEM_AREAS[item.area] ?? item.area }] : [])),
    subjects,
  };
}

export async function listQuestions(userId: string, filters: BankFilters, page: number) {
  const prisma = getPrisma();
  const where = buildWhere(userId, filters);
  const [total, rows] = await Promise.all([
    prisma.bankQuestion.count({ where }),
    prisma.bankQuestion.findMany({
      where,
      include: { ...questionInclude, answers: { where: { userId }, orderBy: { answeredAt: "desc" }, take: 1, select: { isCorrect: true } } },
      orderBy: [{ year: "desc" }, { number: "asc" }],
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, rows };
}

export async function getQuestionForUser(userId: string, id: string) {
  const prisma = getPrisma();
  const row = await prisma.bankQuestion.findFirst({ where: { AND: [{ id }, visibleWhere(userId)] }, include: questionInclude });
  if (!row) return null;
  const bookmarked = Boolean(await prisma.questionBookmark.findUnique({ where: { userId_questionId: { userId, questionId: id } } }));
  return { row, question: toClientQuestion(row, bookmarked) };
}

// ---------------------------------------------------------------------------------------------
// Sessões (prática, simulado, diagnóstico)
// ---------------------------------------------------------------------------------------------

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Sorteia questões que cabem nos filtros (sem repetir). */
export async function pickQuestionIds(userId: string, filters: BankFilters, count: number) {
  const rows = await getPrisma().bankQuestion.findMany({ where: buildWhere(userId, filters), select: { id: true }, take: 3000 });
  return shuffle(rows.map((row) => row.id)).slice(0, count);
}

export async function createSession(input: {
  userId: string;
  kind: SessionKind;
  title: string;
  questionIds: string[];
  examSlug?: string;
  timeLimitSec?: number | null;
}) {
  if (!input.questionIds.length) throw new BankError("Nenhuma questão encontrada com esses filtros. Tente outros.", 404);
  const prisma = getPrisma();
  const exam = input.examSlug ? await prisma.exam.findUnique({ where: { slug: input.examSlug }, select: { id: true } }) : null;
  return prisma.bankSession.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      examId: exam?.id,
      questionIds: input.questionIds,
      timeLimitSec: input.timeLimitSec ?? null,
    },
  });
}

export async function getSessionForUser(userId: string, sessionId: string) {
  const prisma = getPrisma();
  const session = await prisma.bankSession.findFirst({ where: { id: sessionId, userId }, include: { exam: { select: { name: true, slug: true } }, answers: true } });
  if (!session) return null;
  const ids = Array.isArray(session.questionIds) ? (session.questionIds as string[]) : [];
  const rows = await prisma.bankQuestion.findMany({ where: { id: { in: ids } }, include: questionInclude });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = ids.flatMap((id) => (byId.has(id) ? [byId.get(id) as QuestionRow] : []));
  return { session, questions: ordered };
}

/** O simulado e o diagnóstico escondem gabarito e resolução até o fim; a prática mostra na hora. */
export function revealsAfterAnswer(kind: string) {
  return kind === "practice";
}

export async function answerQuestion(input: { userId: string; questionId: string; selected: string; timeMs: number; sessionId?: string }) {
  const prisma = getPrisma();
  const selected = input.selected.trim().toUpperCase();
  const found = await getQuestionForUser(input.userId, input.questionId);
  if (!found) throw new BankError("Questão não encontrada.", 404);
  const options = parseOptions(found.row.options);
  if (!options.some((option) => option.label === selected)) throw new BankError("Alternativa inválida.", 400);

  let kind: string = "practice";
  if (input.sessionId) {
    const session = await prisma.bankSession.findFirst({ where: { id: input.sessionId, userId: input.userId } });
    if (!session) throw new BankError("Sessão não encontrada.", 404);
    if (session.finishedAt) throw new BankError("Esta sessão já foi encerrada.", 409);
    const ids = Array.isArray(session.questionIds) ? (session.questionIds as string[]) : [];
    if (!ids.includes(input.questionId)) throw new BankError("Questão fora desta sessão.", 400);
    kind = session.kind;
    const existing = await prisma.bankAnswer.findUnique({ where: { sessionId_questionId: { sessionId: session.id, questionId: input.questionId } } });
    if (existing) {
      if (!revealsAfterAnswer(kind)) return { recorded: true as const, alreadyAnswered: true };
      return { recorded: true as const, alreadyAnswered: true, isCorrect: existing.isCorrect, ...toReveal(found.row) };
    }
  }

  const isCorrect = selected === found.row.correctLabel;
  const timeMs = Math.min(Math.max(0, Math.round(input.timeMs)), 60 * 60 * 1000);
  await prisma.bankAnswer.create({
    data: { userId: input.userId, questionId: input.questionId, sessionId: input.sessionId, selected, isCorrect, timeMs },
  });

  // Errou: a questão entra na revisão espaçada (volta amanhã).
  if (!isCorrect) {
    await prisma.questionReview.upsert({
      where: { userId_questionId: { userId: input.userId, questionId: input.questionId } },
      update: {},
      create: { userId: input.userId, questionId: input.questionId, source: "erro", nextReview: new Date(Date.now() + DAY_MS) },
    });
  }

  if (!revealsAfterAnswer(kind)) return { recorded: true as const, alreadyAnswered: false };
  return { recorded: true as const, alreadyAnswered: false, isCorrect, ...toReveal(found.row) };
}

export type SessionResult = {
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
  durationSec: number;
  byArea: Array<{ area: string; name: string; total: number; correct: number; accuracy: number; estimate: ReturnType<typeof estimateAreaScore> }>;
  bySubject: Array<{ name: string; total: number; correct: number; accuracy: number }>;
  overallEstimate: ReturnType<typeof estimateOverallScore>;
  items: Array<{ questionId: string; selected: string | null; isCorrect: boolean; timeMs: number }>;
};

/** Resultado de uma sessão. Questão em branco conta como erro (como na prova). */
export function computeResult(
  questions: Array<{ id: string; area: string | null; correctLabel: string; subject: { name: string } | null }>,
  answers: Array<{ questionId: string; selected: string; isCorrect: boolean; timeMs: number }>,
  durationSec: number,
): SessionResult {
  const answerBy = new Map(answers.map((answer) => [answer.questionId, answer]));
  const areaMap = new Map<string, { total: number; correct: number }>();
  const subjectMap = new Map<string, { total: number; correct: number }>();
  const items: SessionResult["items"] = [];
  let correct = 0;

  for (const question of questions) {
    const answer = answerBy.get(question.id);
    const ok = Boolean(answer?.isCorrect);
    if (ok) correct += 1;
    items.push({ questionId: question.id, selected: answer?.selected ?? null, isCorrect: ok, timeMs: answer?.timeMs ?? 0 });
    const areaKey = question.area ?? "geral";
    const area = areaMap.get(areaKey) ?? { total: 0, correct: 0 };
    area.total += 1;
    if (ok) area.correct += 1;
    areaMap.set(areaKey, area);
    const subjectKey = question.subject?.name ?? "Sem matéria";
    const subject = subjectMap.get(subjectKey) ?? { total: 0, correct: 0 };
    subject.total += 1;
    if (ok) subject.correct += 1;
    subjectMap.set(subjectKey, subject);
  }

  const byArea = [...areaMap.entries()].map(([area, value]) => ({
    area,
    name: ENEM_AREAS[area] ?? "Geral",
    ...value,
    accuracy: percent(value.correct, value.total),
    estimate: estimateAreaScore(value.correct, value.total),
  }));
  return {
    total: questions.length,
    answered: answers.length,
    correct,
    accuracy: percent(correct, questions.length),
    durationSec,
    byArea,
    bySubject: [...subjectMap.entries()].map(([name, value]) => ({ name, ...value, accuracy: percent(value.correct, value.total) })).sort((a, b) => a.accuracy - b.accuracy),
    overallEstimate: estimateOverallScore(byArea.filter((item) => item.area !== "geral")),
    items,
  };
}

/** Encerra a sessão (uma vez só) e registra o tempo de estudo para o painel de desempenho. */
export async function finishSession(userId: string, sessionId: string) {
  const loaded = await getSessionForUser(userId, sessionId);
  if (!loaded) throw new BankError("Sessão não encontrada.", 404);
  const { session, questions } = loaded;
  const prisma = getPrisma();

  const finishedAt = session.finishedAt ?? new Date();
  const elapsedSec = Math.max(1, Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000));
  const answeredSec = Math.round(session.answers.reduce((sum, answer) => sum + answer.timeMs, 0) / 1000);
  const durationSec = Math.min(elapsedSec, Math.max(answeredSec, 1) * 2 + 60);

  if (!session.finishedAt) {
    await prisma.$transaction([
      prisma.bankSession.update({ where: { id: session.id }, data: { finishedAt } }),
      prisma.studySession.create({
        data: {
          userId,
          subject: questions[0]?.subject?.name && new Set(questions.map((q) => q.subjectId)).size === 1 ? questions[0].subject.name : "Multidisciplinar",
          durationMinutes: Math.max(1, Math.min(240, Math.round(durationSec / 60))),
          method: session.kind === "practice" ? "quiz" : "simulado",
          notes: `Prova anterior: ${session.title}`,
        },
      }),
    ]);
  }

  return { session: { ...session, finishedAt }, questions, result: computeResult(questions, session.answers, durationSec) };
}

// ---------------------------------------------------------------------------------------------
// Marcar, revisar e reportar
// ---------------------------------------------------------------------------------------------

export async function setBookmark(userId: string, questionId: string, on: boolean) {
  const prisma = getPrisma();
  const found = await getQuestionForUser(userId, questionId);
  if (!found) throw new BankError("Questão não encontrada.", 404);
  if (on) {
    await prisma.questionBookmark.upsert({ where: { userId_questionId: { userId, questionId } }, update: {}, create: { userId, questionId } });
    // Marcada: entra na revisão espaçada para hoje.
    await prisma.questionReview.upsert({ where: { userId_questionId: { userId, questionId } }, update: {}, create: { userId, questionId, source: "marcada", nextReview: new Date() } });
  } else {
    await prisma.questionBookmark.deleteMany({ where: { userId, questionId } });
  }
  return { bookmarked: on };
}

export async function getReviewQueue(userId: string, includeUpcoming = false) {
  const prisma = getPrisma();
  const now = new Date();
  const where = { userId, ...(includeUpcoming ? {} : { nextReview: { lte: now } }), question: visibleWhere(userId) };
  const [dueCount, upcomingCount, rows] = await Promise.all([
    prisma.questionReview.count({ where: { userId, nextReview: { lte: now }, question: visibleWhere(userId) } }),
    prisma.questionReview.count({ where: { userId, nextReview: { gt: now }, question: visibleWhere(userId) } }),
    prisma.questionReview.findMany({ where, orderBy: { nextReview: "asc" }, take: 30, include: { question: { include: questionInclude } } }),
  ]);
  return { dueCount, upcomingCount, rows };
}

export async function gradeReview(userId: string, questionId: string, grade: ReviewGrade) {
  const prisma = getPrisma();
  const review = await prisma.questionReview.findUnique({ where: { userId_questionId: { userId, questionId } } });
  if (!review) throw new BankError("Esta questão não está na sua revisão.", 404);
  const next = nextSchedule({ easeFactor: review.easeFactor, intervalDays: review.intervalDays, repetitions: review.repetitions }, grade);
  await prisma.questionReview.update({
    where: { id: review.id },
    data: { easeFactor: next.easeFactor, intervalDays: next.intervalDays, repetitions: next.repetitions, nextReview: next.nextReview, lastReviewedAt: new Date() },
  });
  return next;
}

export async function reportQuestion(input: { userId: string; questionId: string; kind: string; note?: string }) {
  if (!(REPORT_KINDS as readonly string[]).includes(input.kind)) throw new BankError("Tipo de problema inválido.", 400);
  const found = await getQuestionForUser(input.userId, input.questionId);
  if (!found) throw new BankError("Questão não encontrada.", 404);
  const prisma = getPrisma();
  const recent = await prisma.questionReport.count({ where: { userId: input.userId, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
  if (recent >= 20) throw new BankError("Você já enviou muitos avisos hoje. Obrigado, vamos analisar!", 429);
  await prisma.questionReport.create({
    data: { userId: input.userId, questionId: input.questionId, kind: input.kind as ReportKind, note: input.note?.trim().slice(0, 1000) || null },
  });
  return { ok: true };
}

export async function getBookmarkedIds(userId: string, ids: string[]) {
  if (!ids.length) return new Set<string>();
  const rows = await getPrisma().questionBookmark.findMany({ where: { userId, questionId: { in: ids } }, select: { questionId: true } });
  return new Set(rows.map((row) => row.questionId));
}
