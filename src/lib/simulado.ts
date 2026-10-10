import { getLearnerPromptProfile, learnerPromptBlock } from "@/lib/exam-style";
import { isVideoFile, videoMaterialInstruction } from "@/lib/youtube";
import type { User } from "@supabase/supabase-js";
import { getPrisma } from "@/lib/prisma";
import { PlanLimitError, withFeature } from "@/lib/usage";
import { produceQuestions } from "@/lib/checked-questions";
import { answerFormatInstruction, describeSubjectForPrompt, optionCountForStyle, partInstruction } from "@/lib/quiz-questions";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSimuladoForUser({
  userId,
  subject,
  topic,
  title,
  questionCount = 20,
  fileId,
}: {
  userId: string;
  subject: string;
  topic?: string;
  title?: string;
  questionCount?: number;
  /** Material base (arquivo ou vídeo), opcional. */
  fileId?: string;
}) {
  const prisma = getPrisma();
  const file = fileId ? await prisma.uploadedFile.findFirst({ where: { id: fileId, userId } }) : null;
  const video = isVideoFile(file);
  const promptScope = describeSubjectForPrompt(subject, topic ?? file?.textContent?.slice(0, video ? 14000 : 5000));
  const learner = await getLearnerPromptProfile(userId, subject);
  const style = learner.style;
  const optionCount = optionCountForStyle(style);
  const buildPrompt = (count: number, part: number, parts: number, references: string) => `Crie exatamente ${count} questoes para um simulado realista sobre ${JSON.stringify(promptScope)}.
Regras obrigatorias:
- Siga o estilo de ${style}, com contexto concreto em cada enunciado.
- Nao use placeholders como "Alternativa correta", "Distrator plausivel" ou "resolva a situacao-problema proposta" sem apresentar a situacao.
- Se for multidisciplinar, distribua as questoes entre as materias indicadas e varie as habilidades cobradas.
- Cada alternativa deve ser plausivel e especifica; a explicacao deve justificar a resposta correta em ate 3 frases.
- Confira cada questao: exatamente UMA alternativa correta, e o gabarito e a explicacao precisam bater com ela.${video ? videoMaterialInstruction("quiz") : ""}${partInstruction(part, parts)}${references}${learnerPromptBlock(learner)}
Retorne APENAS um array JSON valido com question, ${answerFormatInstruction(optionCount)} e explanation.`;
  const safeQuestions = await produceQuestions({
    userId,
    count: questionCount,
    subject,
    topic: file ? null : topic,
    style,
    difficulty: "simulado",
    personalMaterial: Boolean(file),
    buildPrompt,
    optionCount,
  });

  return prisma.quiz.create({
    data: {
      userId,
      fileId: file?.id,
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

/**
 * Simulado semanal automático. Gera com IA, então respeita o limite de simulados do plano:
 * sem assinatura ou com o limite gasto, simplesmente não gera.
 */
export async function ensureWeeklySimuladoForUser(user: Pick<User, "id" | "email">) {
  const userId = user.id;
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

  try {
    return await withFeature(user, "ai_simulado", () =>
      createSimuladoForUser({
        userId,
        subject,
        topic: `Simulado semanal com base nas materias estudadas: ${subjects.join(", ") || "conhecimentos gerais"}`,
        title: "Simulado semanal automatico",
        questionCount: 20,
      }),
      { amount: 20 },
    );
  } catch (error) {
    if (error instanceof PlanLimitError) return null;
    throw error;
  }
}
