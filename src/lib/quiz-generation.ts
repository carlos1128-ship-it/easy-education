import { getLearnerPromptProfile, learnerPromptBlock } from "@/lib/exam-style";
import { getPrisma } from "@/lib/prisma";
import { produceQuestions } from "@/lib/checked-questions";
import { answerFormatInstruction, describeSubjectForPrompt, optionCountForStyle, partInstruction } from "@/lib/quiz-questions";
import { isVideoFile, videoMaterialInstruction } from "@/lib/youtube";

export type QuizGenerationInput = {
  userId: string;
  subject: string;
  topic?: string;
  fileId?: string;
  difficulty: string;
  questionCount: number;
  /** Estilo da prova. Sem ele, segue o objetivo do aluno no perfil. */
  model?: string;
};

/** Gera um quiz com a IA e salva no banco. Usado pela tela de quizzes e pelo chat. */
export async function createQuizForUser(input: QuizGenerationInput) {
  const prisma = getPrisma();
  const file = input.fileId ? await prisma.uploadedFile.findFirst({ where: { id: input.fileId, userId: input.userId } }) : null;
  const video = isVideoFile(file);
  // Anotação de vídeo é mais longa e tem as marcas de tempo: manda mais texto.
  const topic = input.topic ?? file?.textContent?.slice(0, video ? 14000 : 5000);
  const promptScope = describeSubjectForPrompt(input.subject, topic);
  const learner = await getLearnerPromptProfile(input.userId, input.subject);
  const style = input.model ?? learner.style;
  const optionCount = optionCountForStyle(style);
  const buildPrompt = (count: number, part: number, parts: number, references: string) => `Gere exatamente ${count} questoes ineditas de multipla escolha sobre ${JSON.stringify(promptScope)} no nivel ${input.difficulty} no estilo de ${style}.
Regras obrigatorias:
- Cada enunciado deve conter uma situacao, dado, texto curto, fenomeno ou contexto real; nao use "resolva a situacao-problema proposta" sem apresentar a situacao.
- As alternativas devem ser conteudos concretos, nunca "Alternativa correta", "Distrator plausivel", "Distrator comum" ou placeholders.
- Se houver mais de uma materia, distribua as questoes entre elas e cite a materia no enunciado de forma natural.
- A explicacao deve justificar a alternativa correta e mencionar por que ao menos um distrator esta errado.
- Explicacao objetiva, em ate 3 frases.
- Confira cada questao: exatamente UMA alternativa correta, e o gabarito e a explicacao precisam bater com ela.${video ? videoMaterialInstruction("quiz") : ""}${partInstruction(part, parts)}${references}${learnerPromptBlock(learner)}
Retorne APENAS um array JSON valido com exatamente estes campos: question (string), ${answerFormatInstruction(optionCount)}, explanation (string).`;
  const questions = await produceQuestions({
    userId: input.userId,
    count: input.questionCount,
    subject: input.subject,
    topic: file ? null : input.topic,
    style,
    difficulty: input.difficulty,
    personalMaterial: Boolean(file),
    buildPrompt,
    optionCount,
  });

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
