import { ORIGIN, slugify } from "@/lib/bank/constants";
import { isEnemStudent } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { normalizeQuizOptions } from "@/lib/quiz-questions";
import type { GeneratedQuizQuestion } from "@/types";

/**
 * Reaproveitamento de questões geradas por IA entre alunos, e provas anteriores como referência de estilo.
 *
 * - Toda questão de quiz/simulado que passa na conferência às cegas fica guardada pela matéria/assunto e pelo
 *   estilo de prova. Quando outro aluno pede o mesmo assunto no mesmo estilo, recebe primeiro as guardadas que
 *   ainda não viu (custo zero de IA) e a IA só cria o que faltar. Assim cada concurso, vestibular ou matéria
 *   vai formando o próprio banco de questões com o tempo.
 * - Quem estuda para o ENEM: a IA recebe questões oficiais do mesmo assunto só como referência (estilo,
 *   nível, habilidade) e cria questões novas, com outro contexto e outros dados. Nunca copia.
 */

export type PoolKey = { subjectKey: string; styleKey: string; difficulty: string };

export function poolKey(input: { subject: string; topic?: string | null; style: string; difficulty: string }): PoolKey {
  const subject = slugify(input.subject) || "geral";
  const topic = input.topic ? slugify(input.topic).slice(0, 60) : "";
  return { subjectKey: topic ? `${subject}|${topic}` : subject, styleKey: slugify(input.style).slice(0, 120) || "geral", difficulty: input.difficulty };
}

/** Pega até `max` questões guardadas que este aluno ainda não recebeu, e registra que ele recebeu. */
export async function takeFromPool(userId: string, key: PoolKey, max: number): Promise<GeneratedQuizQuestion[]> {
  if (max <= 0) return [];
  const prisma = getPrisma();
  const rows = await prisma.sharedQuestion.findMany({
    where: { ...key, uses: { none: { userId } }, NOT: { sourceUserId: userId } },
    orderBy: [{ timesUsed: "asc" }, { createdAt: "desc" }],
    take: max,
  });
  if (!rows.length) return [];
  await prisma.$transaction([
    prisma.sharedQuestionUse.createMany({ data: rows.map((row) => ({ userId, questionId: row.id })), skipDuplicates: true }),
    prisma.sharedQuestion.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { timesUsed: { increment: 1 } } }),
  ]);
  return rows.map((row) => ({
    question: row.question,
    options: normalizeQuizOptions(row.options),
    correctAnswer: row.correctAnswer,
    explanation: row.explanation,
  }));
}

/** Guarda as questões aprovadas na conferência (e marca que este aluno já as recebeu). Nunca derruba a geração. */
export async function addToPool(userId: string, key: PoolKey, questions: GeneratedQuizQuestion[]) {
  if (!questions.length) return;
  try {
    const prisma = getPrisma();
    const created = await prisma.sharedQuestion.createManyAndReturn({
      data: questions.map((question) => ({
        ...key,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        sourceUserId: userId,
        timesUsed: 1,
      })),
      select: { id: true },
    });
    await prisma.sharedQuestionUse.createMany({ data: created.map((row) => ({ userId, questionId: row.id })), skipDuplicates: true });
  } catch (error) {
    console.error("[question-pool.add]", error instanceof Error ? error.message : error);
  }
}

/** Matéria do banco (provas anteriores) que corresponde ao texto pedido pelo aluno. */
async function findBankSubject(subject: string) {
  const text = subject.trim();
  if (!text) return null;
  const prisma = getPrisma();
  return prisma.bankSubject.findFirst({
    where: { OR: [{ slug: slugify(text) }, { name: { contains: text, mode: "insensitive" } }, { slug: { in: text.split(/[,;/]| e /i).map((part) => slugify(part)).filter(Boolean) } }] },
    select: { id: true, name: true, area: true },
  });
}

export type BankReferences = { prompt: string; statements: string[] };

/**
 * Até 2 questões oficiais do ENEM do mesmo assunto, como referência de estilo para a IA criar questões novas.
 * Só para quem estuda para o ENEM. Sem matéria correspondente no banco, não manda referência.
 */
export async function bankReferencesFor(userId: string, subject: string, topic?: string | null): Promise<BankReferences | null> {
  const prisma = getPrisma();
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { personalization: true } });
  if (!isEnemStudent(profile?.personalization)) return null;
  const bankSubject = await findBankSubject(subject);
  const where = {
    isPublished: true,
    origin: ORIGIN.official,
    images: { equals: [] },
    ...(bankSubject ? { subjectId: bankSubject.id } : {}),
    ...(topic ? { OR: [{ topic: { name: { contains: topic, mode: "insensitive" as const } } }, { statement: { contains: topic, mode: "insensitive" as const } }] } : {}),
  };
  if (!bankSubject && !topic) return null;
  const total = await prisma.bankQuestion.count({ where });
  if (!total) return null;
  const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, total - 2)));
  const rows = await prisma.bankQuestion.findMany({ where, skip, take: 2, select: { statement: true, supportText: true, options: true } });
  if (!rows.length) return null;
  const examples = rows.map((row, index) => {
    const options = Array.isArray(row.options) ? (row.options as Array<{ label: string; text: string }>).map((option) => `${option.label}) ${option.text}`.slice(0, 160)).join("\n") : "";
    return `Exemplo ${index + 1}:\n${(row.supportText ? `${row.supportText}\n` : "").slice(0, 700)}${row.statement.slice(0, 400)}\n${options}`;
  });
  return {
    statements: rows.map((row) => row.statement),
    prompt: `\n- Questões oficiais do ENEM sobre o mesmo assunto, SOMENTE como referência de estilo, nível e habilidade cobrada. Crie questões NOVAS: outro contexto, outros dados, outros números e outras alternativas. Não copie trechos nem reescreva estas questões.\n${examples.join("\n\n")}`,
  };
}

/** A questão gerada é praticamente uma cópia de uma das referências? (mesmo começo de enunciado) */
export function copiesReference(question: GeneratedQuizQuestion, statements: string[]) {
  const normalize = (value: string) => slugify(value).replace(/-/g, " ");
  const generated = normalize(question.question);
  return statements.some((statement) => {
    const reference = normalize(statement).slice(0, 80);
    return reference.length >= 40 && generated.includes(reference);
  });
}
