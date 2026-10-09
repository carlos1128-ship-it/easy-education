import { generateJSONList } from "@/lib/gemini";
import { addToPool, bankReferencesFor, copiesReference, poolKey, takeFromPool } from "@/lib/question-pool";
import { verifyQuizQuestions } from "@/lib/question-quality";
import { generateQuizQuestions, QUIZ_CHUNK_SIZE, questionDedupeKey, quizQuestionsSchema } from "@/lib/quiz-questions";
import type { GeneratedQuizQuestion } from "@/types";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Questões de quiz e simulado, do jeito mais barato e confiável:
 * 1. questões já conferidas de outros alunos, mesmo assunto e estilo, que este aluno ainda não viu (sem IA);
 * 2. a IA cria só as que faltam (para quem estuda para o ENEM, com questões oficiais como referência de estilo);
 * 3. cada questão nova passa pelas regras do sistema e pela conferência às cegas; as aprovadas ficam guardadas.
 * Com material do próprio aluno (PDF, foto, vídeo), não reaproveita nem guarda: o conteúdo é só dele.
 */
export async function produceQuestions(input: {
  userId: string;
  count: number;
  subject: string;
  topic?: string | null;
  style: string;
  difficulty: string;
  personalMaterial: boolean;
  buildPrompt: (count: number, part: number, parts: number, references: string) => string;
}): Promise<GeneratedQuizQuestion[]> {
  const key = input.personalMaterial ? null : poolKey(input);
  const reused = key ? await takeFromPool(input.userId, key, input.count).catch(() => []) : [];
  const missing = input.count - reused.length;
  if (missing <= 0) return shuffle(reused);

  const references = input.personalMaterial ? null : await bankReferencesFor(input.userId, input.subject, input.topic).catch(() => null);
  const approved: GeneratedQuizQuestion[] = [];
  const fresh = await generateQuizQuestions(
    missing,
    (count) =>
      generateJSONList<GeneratedQuizQuestion>({
        total: count,
        // Simulado grande: partes de 10 (metade dos pedidos à IA, cabe no limite de pedidos por minuto).
        chunkSize: count > 30 ? 10 : QUIZ_CHUNK_SIZE,
        schema: quizQuestionsSchema,
        buildPrompt: (size, part, parts) => input.buildPrompt(size, part, parts, references?.prompt ?? ""),
        dedupeKey: questionDedupeKey,
      }),
    {
      verify: verifyQuizQuestions,
      reject: references ? (question) => copiesReference(question, references.statements) : undefined,
      onVerified: (questions) => approved.push(...questions),
    },
  );
  if (key) await addToPool(input.userId, key, approved.filter((question) => fresh.includes(question)));
  return shuffle([...reused, ...fresh]);
}
