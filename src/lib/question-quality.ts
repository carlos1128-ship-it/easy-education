import { Type, type Schema } from "@google/genai";
import { generateJSON } from "@/lib/gemini";
import { lettersFor, type OptionCount } from "@/lib/quiz-questions";
import type { GeneratedFlashcard, GeneratedQuizQuestion } from "@/types";

/**
 * Conferência das questões e cartões gerados pela IA, antes de chegarem ao aluno.
 *
 * Quiz e simulado: outra chamada à IA resolve cada questão SEM ver o gabarito. Só fica a questão em que a
 * resposta bate com o gabarito gerado (mesma regra das provas anteriores: gabarito e resolução concordam).
 * Flashcards: a IA confere se o verso responde a frente com fatos corretos.
 * É a mistura que garante qualidade: a IA cria, o sistema confere e descarta o que não fecha.
 */

export type Verified<T> = { items: T[]; verified: boolean };

const solveSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: { n: { type: Type.INTEGER }, answer: { type: Type.STRING, enum: ["A", "B", "C", "D", "E"] } },
    required: ["n", "answer"],
  },
};

const checkSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: { n: { type: Type.INTEGER }, ok: { type: Type.BOOLEAN } },
    required: ["n", "ok"],
  },
};

/** Conferência com outro modelo (ex.: gemini-2.5-flash conferindo o flash-lite). Vazio: o mesmo da geração. */
const VERIFY_MODEL = process.env.GEMINI_VERIFY_MODEL?.trim() || undefined;

/** Questões por chamada de conferência: blocos pequenos resolvem melhor e rodam em paralelo (simulado de 90). */
const VERIFY_BATCH = 15;

/** Resolve às cegas e mantém só as questões em que a resposta da IA bate com o gabarito. */
export async function verifyQuizQuestions(questions: GeneratedQuizQuestion[], optionCount: OptionCount = 4, options: VerifyOptions = {}): Promise<Verified<GeneratedQuizQuestion>> {
  if (questions.length <= VERIFY_BATCH) return verifyQuizBatch(questions, optionCount, options);
  const batches: GeneratedQuizQuestion[][] = [];
  for (let i = 0; i < questions.length; i += VERIFY_BATCH) batches.push(questions.slice(i, i + VERIFY_BATCH));
  const results = await Promise.all(batches.map((batch) => verifyQuizBatch(batch, optionCount, options)));
  return { items: results.flatMap((result) => result.items), verified: results.every((result) => result.verified) };
}

/** Modelo da conferência (padrão: o mesmo da geração). Trocar de família/tamanho reduz erros que coincidem. */
export type VerifyOptions = { model?: string };

/**
 * Resolve as questões SEM ver o gabarito e devolve a letra escolhida para cada uma (posição → letra).
 * Lança erro se a IA falhar. Usado pela conferência e pela avaliação de confiabilidade (scripts/eval).
 */
export async function solveBlind(questions: Array<Pick<GeneratedQuizQuestion, "question" | "options">>, optionCount: OptionCount = 4, options: VerifyOptions = {}) {
  const listing = questions
    .map((question, index) => `${index + 1}) ${question.question}\n${question.options.join("\n")}`)
    .join("\n\n");
  const answers = await generateJSON<Array<{ n: number; answer: string }>>(
    `Resolva cada questão de múltipla escolha abaixo com cuidado e responda só a letra correta de cada uma.
Se uma questão tiver mais de uma alternativa correta, nenhuma correta, dados que faltam ou erro de conteúdo, responda a letra que considera menos errada (ela será descartada se não bater).

${listing}

Responda um array JSON com { "n": número da questão, "answer": ${lettersFor(optionCount).map((letter) => `"${letter}"`).join(" | ")} } para cada questão.`,
    { schema: solveSchema, thinkingBudget: 1024, temperature: 0, ...((options.model ?? VERIFY_MODEL) ? { model: options.model ?? VERIFY_MODEL } : {}) },
  );
  return new Map(answers.map((item) => [item.n - 1, String(item.answer).trim().toUpperCase().charAt(0)]));
}

async function verifyQuizBatch(questions: GeneratedQuizQuestion[], optionCount: OptionCount, options: VerifyOptions): Promise<Verified<GeneratedQuizQuestion>> {
  if (!questions.length) return { items: [], verified: true };
  try {
    const answers = await solveBlind(questions, optionCount, options);
    return { items: questions.filter((question, index) => answers.get(index) === question.correctAnswer), verified: true };
  } catch (error) {
    // Conferência indisponível (IA fora do ar): entrega o que passou nas regras do sistema, sem guardar para reaproveitar.
    console.error("[question-quality.quiz]", error instanceof Error ? error.message : error);
    return { items: questions, verified: false };
  }
}

/** Mantém só os cartões em que o verso responde a frente com fatos corretos. */
export async function verifyFlashcards(cards: GeneratedFlashcard[]): Promise<Verified<GeneratedFlashcard>> {
  if (!cards.length) return { items: [], verified: true };
  const listing = cards.map((card, index) => `${index + 1}) FRENTE: ${card.front}\nVERSO: ${card.back}`).join("\n\n");
  try {
    const checks = await generateJSON<Array<{ n: number; ok: boolean }>>(
      `Confira cada flashcard de estudo abaixo. Marque ok = true só se o verso responde exatamente o que a frente pergunta e o conteúdo está correto (fatos, datas, fórmulas, definições). Marque ok = false se estiver errado, vago, incompleto ou não responder a pergunta.

${listing}

Responda um array JSON com { "n": número do cartão, "ok": true | false } para cada cartão.`,
      { schema: checkSchema, thinkingBudget: 512, temperature: 0 },
    );
    const byNumber = new Map(checks.map((item) => [item.n, item.ok]));
    // Cartão que a conferência não citou fica (ela só tira o que reprovou explicitamente).
    return { items: cards.filter((_, index) => byNumber.get(index + 1) !== false), verified: true };
  } catch (error) {
    console.error("[question-quality.flashcards]", error instanceof Error ? error.message : error);
    return { items: cards, verified: false };
  }
}
