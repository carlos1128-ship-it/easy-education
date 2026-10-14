import { ORIGIN, PAST_EXAMS, type PastExamSlug } from "@/lib/bank/constants";
import { pickPreferringUnseen } from "@/lib/bank/enem-simulado";
import { visibleWhere } from "@/lib/bank/service";
import { isUltrasecret, topKeysForExam } from "@/lib/bank/ultrasecret";
import { getPrisma } from "@/lib/prisma";

/**
 * Área "Provas anteriores": treino por exame e matéria com questões oficiais (ENEM, FUVEST, UNICAMP, ETEC) e
 * a prova completa de cada edição.
 *
 * Questão ultrassecreta (assunto que mais cai no exame): ver ultrasecret.ts.
 */

export const PRACTICE_SIZE = 10;
/** Tempo da prova completa por exame (o oficial da 1ª fase). */
export const FULL_EXAM_TIME_SEC: Record<string, number> = { fuvest: 5 * 3600, unicamp: 5 * 3600, etec: 4 * 3600, fatec: 5 * 3600, unesp: 4 * 3600 + 30 * 60, enem: 5 * 3600 + 30 * 60 };

export function isPastExam(slug: string): slug is PastExamSlug {
  return slug in PAST_EXAMS;
}

export type ExamOverview = {
  slug: PastExamSlug;
  name: string;
  tagline: string;
  total: number;
  years: number[];
  answered: number;
  correct: number;
};

/** Resumo de cada exame com questões publicadas: quantas há, de que anos e como o aluno foi. */
export async function getPastExamsOverview(userId: string): Promise<ExamOverview[]> {
  const prisma = getPrisma();
  const slugs = Object.keys(PAST_EXAMS) as PastExamSlug[];
  const exams = await prisma.exam.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const result: ExamOverview[] = [];
  for (const slug of slugs) {
    const exam = exams.find((item) => item.slug === slug);
    if (!exam) continue;
    const where = { isPublished: true, origin: ORIGIN.official, examId: exam.id };
    const [total, years, answers] = await Promise.all([
      prisma.bankQuestion.count({ where }),
      prisma.bankQuestion.groupBy({ by: ["year"], where }),
      prisma.bankAnswer.groupBy({ by: ["isCorrect"], where: { userId, question: { examId: exam.id } }, _count: { _all: true } }),
    ]);
    if (!total) continue;
    const answered = answers.reduce((sum, row) => sum + row._count._all, 0);
    const correct = answers.find((row) => row.isCorrect)?._count._all ?? 0;
    result.push({ slug, ...PAST_EXAMS[slug], total, years: years.map((row) => row.year).sort((a, b) => b - a), answered, correct });
  }
  return result;
}

export type SubjectProgress = { slug: string; name: string; total: number; answered: number; correct: number };
export type ExamEdition = { year: number; edition: string; total: number; answered: number };

/** Matérias do exame (com o progresso do aluno) e as edições disponíveis para a prova completa. */
export async function getExamDetail(userId: string, examSlug: PastExamSlug) {
  const prisma = getPrisma();
  const exam = await prisma.exam.findUnique({ where: { slug: examSlug }, select: { id: true } });
  if (!exam) return null;
  const where = { isPublished: true, origin: ORIGIN.official, examId: exam.id };
  const [bySubject, subjects, answered, editions, answeredByEdition] = await Promise.all([
    prisma.bankQuestion.groupBy({ by: ["subjectId"], where, _count: { _all: true } }),
    prisma.bankSubject.findMany({ select: { id: true, slug: true, name: true, sortOrder: true } }),
    prisma.bankAnswer.findMany({ where: { userId, question: where }, select: { isCorrect: true, question: { select: { subjectId: true } } }, distinct: ["questionId"] }),
    prisma.bankQuestion.groupBy({ by: ["year", "edition"], where, _count: { _all: true } }),
    prisma.bankAnswer.findMany({ where: { userId, question: where }, select: { question: { select: { year: true, edition: true } } }, distinct: ["questionId"] }),
  ]);

  const subjectRows: SubjectProgress[] = bySubject
    .flatMap((row) => {
      const subject = subjects.find((item) => item.id === row.subjectId);
      if (!subject) return [];
      const mine = answered.filter((answer) => answer.question.subjectId === subject.id);
      return [{ slug: subject.slug, name: subject.name, total: row._count._all, answered: mine.length, correct: mine.filter((answer) => answer.isCorrect).length, order: subject.sortOrder }];
    })
    .sort((a, b) => a.order - b.order)
    .map((row) => ({ slug: row.slug, name: row.name, total: row.total, answered: row.answered, correct: row.correct }));
  const unclassified = bySubject.find((row) => !row.subjectId)?._count._all ?? 0;

  const editionRows: ExamEdition[] = editions
    .map((row) => ({
      year: row.year,
      edition: row.edition,
      total: row._count._all,
      answered: answeredByEdition.filter((answer) => answer.question.year === row.year && answer.question.edition === row.edition).length,
    }))
    .sort((a, b) => b.year - a.year || b.edition.localeCompare(a.edition));

  return { subjects: subjectRows, unclassified, editions: editionRows };
}

/** Treino: `count` questões do exame (e da matéria), preferindo as que o aluno ainda não respondeu. */
export async function pickPracticeQuestions(userId: string, examSlug: PastExamSlug, subjectSlug: string | null, count = PRACTICE_SIZE, topicId: string | null = null) {
  const prisma = getPrisma();
  const rows = await prisma.bankQuestion.findMany({
    where: {
      AND: [
        visibleWhere(userId),
        { origin: ORIGIN.official, exam: { slug: examSlug } },
        subjectSlug ? { subject: { slug: subjectSlug } } : {},
        // Treino de um assunto só (vem do card "A seguir" do Início).
        topicId ? { topicId } : {},
      ],
    },
    select: { id: true, area: true, subject: { select: { slug: true } } },
    take: 5000,
  });
  const seen = new Set((await prisma.bankAnswer.findMany({ where: { userId, questionId: { in: rows.map((row) => row.id) } }, select: { questionId: true } })).map((row) => row.questionId));
  const top = await topKeysForExam(examSlug);
  const picked = pickPreferringUnseen(rows, seen, count);
  // Pelo menos uma ultrassecreta por treino, quando a matéria tem.
  if (!picked.some((row) => isUltrasecret(row, top))) {
    const secret = pickPreferringUnseen(rows.filter((row) => isUltrasecret(row, top)), seen, 1)[0];
    if (secret && picked.length) picked[Math.min(picked.length - 1, 3 + Math.floor(Math.random() * 4))] = secret;
  }
  return picked.map((row) => row.id);
}

/** Prova completa de uma edição, na ordem original. */
export async function editionQuestionIds(examSlug: PastExamSlug, year: number, edition: string) {
  const rows = await getPrisma().bankQuestion.findMany({
    where: { isPublished: true, origin: ORIGIN.official, exam: { slug: examSlug }, year, edition },
    orderBy: [{ number: "asc" }, { variant: "asc" }],
    select: { id: true, variant: true },
  });
  // ENEM: as 5 de língua estrangeira têm duas versões; fica a de inglês.
  return rows.filter((row) => !row.variant || row.variant === "ingles").map((row) => row.id);
}
