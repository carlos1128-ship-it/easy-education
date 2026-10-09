import { Type, type Schema } from "@google/genai";
import type { GeneratedQuizQuestion } from "@/types";

const LETTERS = ["A", "B", "C", "D"] as const;

type PersistedQuestion = {
  id: string;
  question: string | null;
  options: unknown;
  correctAnswer: string | null;
  explanation: string | null;
  userAnswer?: string | null;
  isCorrect?: boolean | null;
};

export type QuizRunnerQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPlaceholderText(value: string) {
  const normalized = normalizeForMatch(value);
  return (
    normalized.includes("alternativa correta") ||
    normalized.includes("distrator plausivel") ||
    normalized.includes("distrator comum") ||
    normalized.includes("distrator conceitual") ||
    normalized.includes("resolva a situacao-problema proposta") ||
    normalized.includes("questao 1 sobre") ||
    normalized.includes("questao 2 sobre")
  );
}

export function normalizeCorrectAnswer(value: unknown) {
  const answer = cleanText(value).toUpperCase();
  const direct = LETTERS.find((letter) => answer === letter || answer.startsWith(`${letter})`) || answer.startsWith(`${letter}.`));
  return direct ?? "A";
}

export function normalizeQuizOptions(options: unknown) {
  const rawOptions = Array.isArray(options)
    ? options
    : options && typeof options === "object"
      ? LETTERS.map((letter) => (options as Record<string, unknown>)[letter] ?? (options as Record<string, unknown>)[letter.toLowerCase()])
      : [];

  const normalized = rawOptions
    .map((option, index) => {
      const text = cleanText(option);
      if (!text) return "";
      const letter = LETTERS[index] ?? "A";
      return /^[A-D][).]\s?/i.test(text) ? text : `${letter}) ${text}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  while (normalized.length < 4) {
    const letter = LETTERS[normalized.length] ?? "A";
    normalized.push(`${letter}) Alternativa ${letter}`);
  }

  return normalized;
}

/** Texto da alternativa sem a letra do começo ("A) ", "b. "). */
function optionBody(value: unknown) {
  return cleanText(value).replace(/^[A-D]\s*[).:-]\s*/i, "").trim();
}

/**
 * A questão gerada tem enunciado e 4 alternativas de verdade? Recusa alternativa que é só a letra ("A", "B)"),
 * vazia, repetida ou placeholder, e enunciado curto demais. Questão recusada é pedida de novo (generateQuizQuestions).
 */
export function isUsableGeneratedQuestion(item: unknown) {
  const question = (item ?? {}) as Partial<GeneratedQuizQuestion>;
  const text = cleanText(question.question);
  const rawOptions: unknown[] = Array.isArray(question.options) ? question.options : [];
  if (text.length < 15 || isPlaceholderText(text)) return false;
  if (rawOptions.length !== 4) return false;
  const bodies = rawOptions.map(optionBody);
  if (bodies.some((body) => !body || /^[A-E]$/i.test(body) || isPlaceholderText(body) || /^alternativa [a-e]$/.test(normalizeForMatch(body)))) return false;
  if (new Set(bodies.map(normalizeForMatch)).size !== 4) return false;
  const explanation = cleanText(question.explanation);
  if (!explanation || isPlaceholderText(explanation)) return false;
  const answer = cleanText(question.correctAnswer).toUpperCase().charAt(0);
  return (LETTERS as readonly string[]).includes(answer);
}

export function sanitizeGeneratedQuizQuestions(rawQuestions: unknown, count: number) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  return questions
    .filter(isUsableGeneratedQuestion)
    .slice(0, count)
    .map((item) => {
      const question = item as GeneratedQuizQuestion;
      return {
        question: cleanText(question.question),
        options: normalizeQuizOptions((question.options as unknown[]).map(optionBody)),
        correctAnswer: normalizeCorrectAnswer(question.correctAnswer),
        explanation: cleanText(question.explanation),
      };
    });
}

/**
 * Gera as questões e confere cada uma. Se a IA devolver questões quebradas (ex.: alternativas só com a letra),
 * pede de novo só as que faltam, até 2 vezes, antes de aceitar (mínimo de 70%) ou desistir com erro.
 */
export async function generateQuizQuestions(
  count: number,
  generate: (missing: number, round: number) => Promise<unknown[]>,
): Promise<GeneratedQuizQuestion[]> {
  const accepted: GeneratedQuizQuestion[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < 3 && accepted.length < count; round += 1) {
    const missing = count - accepted.length;
    let raw: unknown[];
    try {
      raw = await generate(missing, round);
    } catch (error) {
      if (!accepted.length) throw error;
      break;
    }
    for (const question of sanitizeGeneratedQuizQuestions(raw, missing)) {
      const key = questionDedupeKey(question);
      if (seen.has(key)) continue;
      seen.add(key);
      accepted.push(question);
    }
  }
  return fillQuestionCount(accepted, count);
}

/**
 * Corta no total pedido. Com a geração em partes, uma parte pode falhar no prazo:
 * aceita a partir de 70% do pedido em vez de jogar fora tudo que já ficou pronto.
 */
export function fillQuestionCount(questions: GeneratedQuizQuestion[], count: number) {
  const safeQuestions = questions.slice(0, count);
  if (safeQuestions.length < Math.min(count, Math.max(3, Math.ceil(count * 0.7)))) {
    throw new Error("A IA retornou poucas questoes validas.");
  }
  return safeQuestions;
}

/** Formato fixo da resposta da IA: o JSON sempre vem completo e não precisa de nova tentativa. */
export const quizQuestionsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: "Enunciado completo da questão." },
      options: {
        type: Type.ARRAY,
        description: "O TEXTO completo das 4 alternativas, na ordem A, B, C, D. Nunca só a letra.",
        items: { type: Type.STRING, description: "Texto da alternativa, sem a letra na frente." },
        minItems: "4",
        maxItems: "4",
      },
      correctAnswer: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
      explanation: { type: Type.STRING },
    },
    required: ["question", "options", "correctAnswer", "explanation"],
    propertyOrdering: ["question", "options", "correctAnswer", "explanation"],
  },
};

/** Questões por parte: 5 saem em ~6 s; o quiz inteiro leva o tempo da parte mais lenta. */
export const QUIZ_CHUNK_SIZE = 5;

const PART_FOCUS = [
  "conceitos centrais e definicoes aplicadas",
  "aplicacao em situacoes do cotidiano e problemas",
  "interpretacao de dados, graficos, tabelas ou textos",
  "relacoes com outros temas e erros comuns dos alunos",
];

/** Diz a cada parte o que cobrir, para as partes não repetirem as mesmas questões. */
export function partInstruction(part: number, parts: number) {
  if (parts <= 1) return "";
  return `\n- Esta e a parte ${part} de ${parts} de uma mesma prova; outras partes cobrem outros pontos. Nesta parte, priorize: ${PART_FOCUS[(part - 1) % PART_FOCUS.length]}. Nao repita questoes de outras partes.`;
}

export function questionDedupeKey(question: Partial<GeneratedQuizQuestion>) {
  return normalizeForMatch(cleanText(question.question)).slice(0, 120);
}

export function toQuizRunnerQuestions(questions: PersistedQuestion[]): QuizRunnerQuestion[] {
  return questions.map((question, index) => ({
    id: question.id,
    question: cleanText(question.question) || `Questao ${index + 1}`,
    options: normalizeQuizOptions(question.options),
    correctAnswer: normalizeCorrectAnswer(question.correctAnswer),
    explanation: cleanText(question.explanation) || "Sem explicacao cadastrada.",
    userAnswer: question.userAnswer ? normalizeCorrectAnswer(question.userAnswer) : null,
    isCorrect: question.isCorrect ?? null,
  }));
}

export function subjectsFromText(subject: string) {
  return subject
    .split(/[,;/+]| e /i)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

export function describeSubjectForPrompt(subject: string, topic?: string) {
  const subjects = subjectsFromText(subject);
  const baseTopic = cleanText(topic);

  if (subject.toLowerCase() === "multidisciplinar" || subjects.length > 1) {
    const listedSubjects = subjects.filter((item) => item.toLowerCase() !== "multidisciplinar");
    const scope = listedSubjects.length ? listedSubjects.join(", ") : "Matematica, Linguagens, Ciencias da Natureza e Ciencias Humanas";
    return `um quiz multidisciplinar cobrindo estas materias: ${scope}. ${baseTopic ? `Tema central: ${baseTopic}.` : "Distribua as questoes entre as materias e use contextos integrados."}`;
  }

  return baseTopic ? `${subject}. Tema: ${baseTopic}` : subject;
}
