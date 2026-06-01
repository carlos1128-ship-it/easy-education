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

    return {
      question: cleanText(question.question) || `Questao ${index + 1} sobre ${subject}.`,
      options: normalizeQuizOptions(question.options),
      correctAnswer: normalizeCorrectAnswer(question.correctAnswer),
      explanation: cleanText(question.explanation) || `Esta questao revisa conceitos de ${subject}.`,
    };
  });
}

export function fallbackQuizQuestions(count: number, subjects: string[]) {
  const baseSubjects = subjects.length ? subjects : ["Matematica", "Portugues", "Biologia", "Historia"];

  return Array.from({ length: count }).map((_, index) => {
    const subject = baseSubjects[index % baseSubjects.length];
    return {
      question: `Questao ${index + 1} - ${subject}: resolva a situacao-problema proposta e escolha a alternativa mais adequada.`,
      options: ["A) Alternativa correta", "B) Distrator plausivel", "C) Distrator comum", "D) Distrator conceitual"],
      correctAnswer: "A",
      explanation: `Esta questao revisa fundamentos de ${subject}.`,
    };
  });
}

export function fillQuestionCount(questions: GeneratedQuizQuestion[], count: number, subjects: string[]) {
  const safeQuestions = questions.slice(0, count);
  if (safeQuestions.length < count) {
    safeQuestions.push(...fallbackQuizQuestions(count - safeQuestions.length, subjects));
  }
  return safeQuestions;
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
