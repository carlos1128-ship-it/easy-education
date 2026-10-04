import { getExamStyleForUser } from "@/lib/exam-style";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { describeSubjectForPrompt, fillQuestionCount, sanitizeGeneratedQuizQuestions } from "@/lib/quiz-questions";
import type { GeneratedQuizQuestion } from "@/types";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSimuladoForUser({
  userId,
  subject,
  topic,
  title,
  questionCount = 20,
}: {
  userId: string;
  subject: string;
  topic?: string;
  title?: string;
  questionCount?: number;
}) {
  const prisma = getPrisma();
  const promptScope = describeSubjectForPrompt(subject, topic);
  const style = await getExamStyleForUser(userId);
  const prompt = `Crie exatamente ${questionCount} questoes para um simulado realista sobre ${JSON.stringify(promptScope)}.
Regras obrigatorias:
- Siga o estilo de ${style}, com contexto concreto em cada enunciado.
- Nao use placeholders como "Alternativa correta", "Distrator plausivel" ou "resolva a situacao-problema proposta" sem apresentar a situacao.
- Se for multidisciplinar, distribua as questoes entre as materias indicadas e varie as habilidades cobradas.
- Cada alternativa deve ser plausivel e especifica; a explicacao deve justificar a resposta correta.
Retorne APENAS um array JSON valido com question, options, correctAnswer e explanation.`;
  const rawQuestions = await generateJSON<GeneratedQuizQuestion[]>(prompt);
  const questions = sanitizeGeneratedQuizQuestions(rawQuestions, questionCount, subject);
  const safeQuestions = fillQuestionCount(questions, questionCount);

  return prisma.quiz.create({
    data: {
      userId,
      title: title ?? `Simulado de ${subject}`,
      subject,
      difficulty: "simulado",
      questionCount: safeQuestions.length,
      questions: {
        create: safeQuestions.map((question, order) => ({
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          order,
        })),
      },
    },
  });
}

export async function ensureWeeklySimuladoForUser(userId: string) {
  const prisma = getPrisma();
  const firstSession = await prisma.studySession.findFirst({
    where: { userId },
    orderBy: { date: "asc" },
  });
  if (!firstSession) return null;

  const eligibleAt = new Date(firstSession.date.getTime() + ONE_WEEK_MS);
  if (eligibleAt > new Date()) return null;

  const existing = await prisma.quiz.findFirst({
    where: { userId, difficulty: "simulado", createdAt: { gte: eligibleAt } },
  });
  if (existing) return existing;

  const sessions = await prisma.studySession.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 40,
  });
  const subjects = [...new Set(sessions.map((session) => session.subject))].slice(0, 6);
  const subject = subjects.length > 1 ? "Multidisciplinar" : subjects[0] ?? "Conhecimentos gerais";

  return createSimuladoForUser({
    userId,
    subject,
    topic: `Simulado semanal com base nas materias estudadas: ${subjects.join(", ") || "conhecimentos gerais"}`,
    title: "Simulado semanal automatico",
    questionCount: 20,
  });
}
