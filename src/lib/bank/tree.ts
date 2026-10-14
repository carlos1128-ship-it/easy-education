import { getPrisma } from "@/lib/prisma";
import { ORIGIN } from "@/lib/bank/constants";
import { isPastExam } from "@/lib/bank/past-exams";

/**
 * Árvore de estudo de uma matéria (matéria → unidade → tópico) com quantas questões oficiais publicadas
 * cada tópico tem e o progresso do aluno nelas. Tudo vem do banco; nenhuma IA na hora de navegar.
 */

export type TreeTopic = {
  id: string;
  name: string;
  questions: number;
  /** Exame com mais questões neste tópico: é dele que sai o treino. */
  examSlug: string | null;
  answered: number;
  correct: number;
};

export type TreeUnit = { id: string; name: string; topics: TreeTopic[]; questions: number; answered: number };

export type SubjectSummary = { slug: string; name: string; units: number; questions: number; answered: number };

type CountRow = { topicId: string | null; examId: string; _count: { _all: number } };

/** Matérias que já têm árvore, com o total de questões e quantas o aluno já respondeu. */
export async function getSubjectSummaries(userId: string): Promise<SubjectSummary[]> {
  const prisma = getPrisma();
  const [subjects, totals, answered] = await Promise.all([
    prisma.bankSubject.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, _count: { select: { units: true } } } }),
    prisma.bankQuestion.groupBy({ by: ["subjectId"], where: { isPublished: true, origin: ORIGIN.official, subjectId: { not: null } }, _count: { _all: true } }),
    prisma.$queryRaw<Array<{ subject_id: string; answered: number }>>`
      SELECT q."subject_id", COUNT(DISTINCT a."question_id")::int AS answered
      FROM "bank_answers" a JOIN "bank_questions" q ON q."id" = a."question_id"
      WHERE a."user_id" = ${userId} AND q."subject_id" IS NOT NULL
      GROUP BY q."subject_id"`,
  ]);
  return subjects
    .filter((subject) => subject._count.units > 0)
    .map((subject) => ({
      slug: subject.slug,
      name: subject.name,
      units: subject._count.units,
      questions: totals.find((row) => row.subjectId === subject.id)?._count._all ?? 0,
      answered: answered.find((row) => row.subject_id === subject.id)?.answered ?? 0,
    }));
}

export async function getSubjectTree(userId: string, subjectSlug: string) {
  const prisma = getPrisma();
  const subject = await prisma.bankSubject.findUnique({
    where: { slug: subjectSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      units: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, topics: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
      },
    },
  });
  if (!subject || !subject.units.length) return null;

  const topicIds = subject.units.flatMap((unit) => unit.topics.map((topic) => topic.id));
  const [counts, exams, progress] = await Promise.all([
    prisma.bankQuestion
      .groupBy({ by: ["topicId", "examId"], where: { isPublished: true, origin: ORIGIN.official, topicId: { in: topicIds } }, _count: { _all: true } })
      .then((rows): CountRow[] => rows.map((row) => ({ topicId: row.topicId, examId: row.examId, _count: { _all: row._count._all } }))),
    prisma.exam.findMany({ select: { id: true, slug: true } }),
    prisma.$queryRaw<Array<{ topic_id: string; answered: number; correct: number }>>`
      SELECT q."topic_id", COUNT(DISTINCT a."question_id")::int AS answered,
             COUNT(DISTINCT a."question_id") FILTER (WHERE a."is_correct")::int AS correct
      FROM "bank_answers" a JOIN "bank_questions" q ON q."id" = a."question_id"
      WHERE a."user_id" = ${userId} AND q."topic_id" = ANY(${topicIds})
      GROUP BY q."topic_id"`,
  ]);
  const examSlug = new Map(exams.map((exam) => [exam.id, exam.slug]));

  const units: TreeUnit[] = subject.units.map((unit) => {
    const topics = unit.topics.map((topic): TreeTopic => {
      const rows = counts.filter((row) => row.topicId === topic.id && isPastExam(examSlug.get(row.examId) ?? ""));
      const best = [...rows].sort((a, b) => b._count._all - a._count._all)[0];
      const mine = progress.find((row) => row.topic_id === topic.id);
      return {
        id: topic.id,
        name: topic.name,
        questions: rows.reduce((sum, row) => sum + row._count._all, 0),
        examSlug: best ? (examSlug.get(best.examId) ?? null) : null,
        answered: mine?.answered ?? 0,
        correct: mine?.correct ?? 0,
      };
    });
    return {
      id: unit.id,
      name: unit.name,
      topics,
      questions: topics.reduce((sum, topic) => sum + topic.questions, 0),
      answered: topics.reduce((sum, topic) => sum + Math.min(topic.answered, topic.questions), 0),
    };
  });
  return { subject: { slug: subject.slug, name: subject.name }, units };
}

/** Progresso em % (respondidas sobre o total), sem passar de 100. */
export function progressPct(answered: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
}
