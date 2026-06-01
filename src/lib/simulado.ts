import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import type { GeneratedQuizQuestion } from "@/types";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function fallbackQuestions(subjects: string[]): GeneratedQuizQuestion[] {
  const baseSubjects = subjects.length ? subjects : ["Matematica", "Portugues", "Biologia", "Historia"];
  return Array.from({ length: 20 }).map((_, index) => {
    const subject = baseSubjects[index % baseSubjects.length];
    return {
      question: `Questao ${index + 1} - ${subject}: resolva a situacao-problema proposta e escolha a alternativa mais adequada.`,
      options: ["A) Alternativa correta", "B) Distrator plausivel", "C) Distrator comum", "D) Distrator conceitual"],
      correctAnswer: "A",
      explanation: `Esta questao revisa fundamentos de ${subject}.`,
    };
  });
}

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
  const prompt = `Crie exatamente ${questionCount} questoes para um simulado realista sobre "${topic ?? subject}". Misture estilos de ENEM, vestibulares brasileiros e concursos quando fizer sentido. Use enunciados contextualizados, mais de uma habilidade cognitiva, alternativas A-D e uma explicacao curta. Retorne APENAS um array JSON valido com question, options, correctAnswer e explanation.`;
  let questions: GeneratedQuizQuestion[];

  try {
    questions = await generateJSON<GeneratedQuizQuestion[]>(prompt);
  } catch {
    questions = fallbackQuestions([subject]);
  }

  const safeQuestions = questions.slice(0, questionCount);
  if (safeQuestions.length < questionCount) {
    safeQuestions.push(...fallbackQuestions([subject]).slice(safeQuestions.length, questionCount));
  }

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
  const subject = subjects.length > 1 ? "Multidisciplinar" : subjects[0] ?? "ENEM";

  return createSimuladoForUser({
    userId,
    subject,
    topic: `Simulado semanal com base nas materias estudadas: ${subjects.join(", ") || "ENEM"}`,
    title: "Simulado semanal automatico",
    questionCount: 20,
  });
}
