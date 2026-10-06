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

export function sanitizeGeneratedQuizQuestions(rawQuestions: unknown, count: number, fallbackSubject: string) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  return questions.slice(0, count).map((item, index) => {
    const question = item as Partial<GeneratedQuizQuestion>;
    const subject = fallbackSubject || "conteudo";
    const questionText = cleanText(question.question) || `Questao ${index + 1} sobre ${subject}.`;
    const options = normalizeQuizOptions(question.options);
    const explanation = cleanText(question.explanation) || `Esta questao revisa conceitos de ${subject}.`;

    return {
      question: questionText,
      options,
      correctAnswer: normalizeCorrectAnswer(question.correctAnswer),
      explanation,
    };
  }).filter((question) => (
    !isPlaceholderText(question.question) &&
    !isPlaceholderText(question.explanation) &&
    question.options.length === 4 &&
    !question.options.some(isPlaceholderText)
  ));
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
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: "4", maxItems: "4" },
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
