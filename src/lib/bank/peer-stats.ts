import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { isPastExam } from "@/lib/bank/past-exams";

/**
 * Comparação com os outros alunos, a partir das respostas já gravadas (nada novo é guardado).
 * Só aparece com amostra mínima: com poucos alunos o número engana mais do que ajuda.
 */

export const MIN_PEER_ANSWERS = 20;
export const MIN_PEER_SESSIONS = 20;

export type QuestionPeerStats = { answers: number; correctPct: number };

/** Quantos responderam cada questão e quantos % acertaram (contando todas as respostas de outros alunos). */
export async function getQuestionPeerStats(questionIds: string[], excludeUserId?: string) {
  const stats = new Map<string, QuestionPeerStats>();
  if (!questionIds.length) return stats;
  const rows = await getPrisma().bankAnswer.groupBy({
    by: ["questionId", "isCorrect"],
    where: { questionId: { in: questionIds }, ...(excludeUserId ? { userId: { not: excludeUserId } } : {}) },
    _count: { _all: true },
  });
  const totals = new Map<string, { answers: number; correct: number }>();
  for (const row of rows) {
    const item = totals.get(row.questionId) ?? { answers: 0, correct: 0 };
    item.answers += row._count._all;
    if (row.isCorrect) item.correct += row._count._all;
    totals.set(row.questionId, item);
  }
  for (const [id, item] of totals) {
    if (item.answers >= MIN_PEER_ANSWERS) stats.set(id, { answers: item.answers, correctPct: Math.round((item.correct / item.answers) * 100) });
  }
  return stats;
}

/** Posição na turma: pura, para testar. Empate conta metade (percentil clássico). */
export function percentileOf(accuracy: number, others: number[]) {
  if (!others.length) return 0;
  const below = others.filter((value) => value < accuracy).length;
  const ties = others.filter((value) => value === accuracy).length;
  return Math.round(((below + ties / 2) / others.length) * 100);
}

type PeerSessionRow = { correct: number; total: number };

/**
 * "Você foi melhor que X% dos alunos". Compara com sessões encerradas de outros alunos:
 * a mesma prova (simulado de uma edição, pelo título) ou o mesmo tipo de treino do mesmo exame.
 */
export async function getSessionPercentile(input: { userId: string; kind: string; examId: string | null; title: string; accuracy: number }) {
  const sameTest = input.kind === "simulado" ? Prisma.sql`AND s."title" = ${input.title}` : Prisma.empty;
  const sameExam = input.examId ? Prisma.sql`AND s."exam_id" = ${input.examId}` : Prisma.sql`AND s."exam_id" IS NULL`;
  const rows = await getPrisma().$queryRaw<PeerSessionRow[]>`
    SELECT COUNT(a."id") FILTER (WHERE a."is_correct")::int AS correct, jsonb_array_length(s."question_ids")::int AS total
    FROM "bank_sessions" s
    LEFT JOIN "bank_answers" a ON a."session_id" = s."id"
    WHERE s."finished_at" IS NOT NULL AND s."user_id" <> ${input.userId} AND s."kind" = ${input.kind} ${sameExam} ${sameTest}
    GROUP BY s."id"
    ORDER BY MAX(s."finished_at") DESC
    LIMIT 5000`;
  const others = rows.filter((row) => row.total > 0).map((row) => Math.round((row.correct / row.total) * 100));
  if (others.length < MIN_PEER_SESSIONS) return null;
  return { percentile: percentileOf(input.accuracy, others), compared: others.length };
}

export type NextTopic = {
  /** null quando a questão só tem matéria (a maioria das provas oficiais ainda não tem assunto classificado). */
  topicId: string | null;
  topic: string | null;
  subject: string;
  subjectSlug: string;
  examSlug: string;
  answered: number;
  accuracy: number;
};

type TopicRow = { topic_id: string | null; topic: string | null; subject: string; subject_slug: string; exam_slug: string; total: number; correct: number };

/** Assunto entra na lista com pelo menos 3 respostas e acerto abaixo de 70%. */
export const NEXT_TOPIC_MIN_ANSWERS = 3;
export const NEXT_TOPIC_MAX_ACCURACY = 70;

/** Escolha pura dos assuntos a reforçar: menor acerto primeiro, depois o mais praticado. */
export function rankWeakTopics(rows: Array<Omit<NextTopic, "accuracy"> & { correct: number }>, limit: number): NextTopic[] {
  return rows
    .filter((row) => row.answered >= NEXT_TOPIC_MIN_ANSWERS)
    .map((row): NextTopic => ({
      topicId: row.topicId,
      topic: row.topic,
      subject: row.subject,
      subjectSlug: row.subjectSlug,
      examSlug: row.examSlug,
      answered: row.answered,
      accuracy: Math.round((row.correct / row.answered) * 100),
    }))
    .filter((row) => row.accuracy < NEXT_TOPIC_MAX_ACCURACY)
    .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)
    .slice(0, limit);
}

/**
 * "A seguir": onde o aluno mais errou nas provas oficiais dos últimos 90 dias. Agrupa pelo assunto quando
 * a questão tem; sem assunto, agrupa pela matéria (o treino sai da matéria inteira).
 */
export async function getNextTopics(userId: string, limit = 3): Promise<NextTopic[]> {
  const rows = await getPrisma().$queryRaw<TopicRow[]>`
    SELECT q."topic_id", t."name" AS topic, sub."name" AS subject, sub."slug" AS subject_slug, e."slug" AS exam_slug,
           COUNT(*)::int AS total, COUNT(*) FILTER (WHERE a."is_correct")::int AS correct
    FROM "bank_answers" a
    JOIN "bank_questions" q ON q."id" = a."question_id"
    JOIN "bank_subjects" sub ON sub."id" = q."subject_id"
    LEFT JOIN "bank_topics" t ON t."id" = q."topic_id"
    JOIN "exams" e ON e."id" = q."exam_id"
    WHERE a."user_id" = ${userId} AND a."answered_at" >= now() - interval '90 days' AND q."origin" = 'prova_oficial'
    GROUP BY q."topic_id", t."name", sub."name", sub."slug", e."slug"`;
  return rankWeakTopics(
    rows
      .filter((row) => isPastExam(row.exam_slug))
      .map((row) => ({ topicId: row.topic_id, topic: row.topic, subject: row.subject, subjectSlug: row.subject_slug, examSlug: row.exam_slug, answered: row.total, correct: row.correct })),
    limit,
  );
}
