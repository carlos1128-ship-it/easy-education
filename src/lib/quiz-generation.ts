import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { describeSubjectForPrompt, fillQuestionCount, sanitizeGeneratedQuizQuestions } from "@/lib/quiz-questions";
import type { GeneratedQuizQuestion } from "@/types";

export type QuizGenerationInput = {
  userId: string;
  subject: string;
  topic?: string;
  fileId?: string;
  difficulty: string;
  questionCount: number;
  model: string;
};

/** Gera um quiz com a IA e salva no banco. Usado pela tela de quizzes e pelo chat. */
export async function createQuizForUser(input: QuizGenerationInput) {
  const prisma = getPrisma();
  const file = input.fileId ? await prisma.uploadedFile.findFirst({ where: { id: input.fileId, userId: input.userId } }) : null;
  const topic = input.topic ?? file?.textContent?.slice(0, 5000);
  const promptScope = describeSubjectForPrompt(input.subject, topic);
  const prompt = `Gere exatamente ${input.questionCount} questoes ineditas de multipla escolha sobre ${JSON.stringify(promptScope)} no nivel ${input.difficulty} no estilo ${input.model}.
Regras obrigatorias:
- Cada enunciado deve conter uma situacao, dado, texto curto, fenomeno ou contexto real; nao use "resolva a situacao-problema proposta" sem apresentar a situacao.
- As alternativas devem ser conteudos concretos, nunca "Alternativa correta", "Distrator plausivel", "Distrator comum" ou placeholders.
- Se houver mais de uma materia, distribua as questoes entre elas e cite a materia no enunciado de forma natural.
- A explicacao deve justificar a alternativa correta e mencionar por que ao menos um distrator esta errado.
Retorne APENAS um array JSON valido com exatamente estes campos: question (string), options (array de exatamente 4 strings A-D), correctAnswer (apenas A, B, C ou D), explanation (string).`;
  const rawQuestions = await generateJSON<GeneratedQuizQuestion[]>(prompt);
  const questions = fillQuestionCount(
    sanitizeGeneratedQuizQuestions(rawQuestions, input.questionCount, input.subject),
    input.questionCount,
  );

  return prisma.quiz.create({
    data: {
      userId: input.userId,
      fileId: input.fileId,
      title: input.topic ?? `Quiz de ${input.subject}`,
      subject: input.subject,
      difficulty: input.difficulty,
      questionCount: questions.length,
      questions: {
        create: questions.map((question, order) => ({
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
