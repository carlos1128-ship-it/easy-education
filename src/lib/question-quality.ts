import { Type, type Schema } from "@google/genai";
import { generateJSON } from "@/lib/gemini";
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
    properties: { n: { type: Type.INTEGER }, answer: { type: Type.STRING, enum: ["A", "B", "C", "D"] } },
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

/** Resolve às cegas e mantém só as questões em que a resposta da IA bate com o gabarito. */
export async function verifyQuizQuestions(questions: GeneratedQuizQuestion[]): Promise<Verified<GeneratedQuizQuestion>> {
  if (!questions.length) return { items: [], verified: true };
  const listing = questions
    .map((question, index) => `${index + 1}) ${question.question}\n${question.options.join("\n")}`)
    .join("\n\n");
  try {
    const answers = await generateJSON<Array<{ n: number; answer: string }>>(
      `Resolva cada questão de múltipla escolha abaixo com cuidado e responda só a letra correta de cada uma.
Se uma questão tiver mais de uma alternativa correta, nenhuma correta, dados que faltam ou erro de conteúdo, responda a letra que considera menos errada (ela será descartada se não bater).

${listing}

Responda um array JSON com { "n": número da questão, "answer": "A" | "B" | "C" | "D" } para cada questão.`,
      { schema: solveSchema, thinkingBudget: 1024, temperature: 0 },
    );
    const byNumber = new Map(answers.map((item) => [item.n, String(item.answer).trim().toUpperCase().charAt(0)]));
    return { items: questions.filter((question, index) => byNumber.get(index + 1) === question.correctAnswer), verified: true };
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
