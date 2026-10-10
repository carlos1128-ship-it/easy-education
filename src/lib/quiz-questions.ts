import { Type, type Schema } from "@google/genai";
import type { GeneratedQuizQuestion } from "@/types";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

/** Quantas alternativas a questão tem: 4 (A a D, padrão) ou 5 (A a E, como ENEM e Vestibulinho da ETEC). */
export type OptionCount = 4 | 5;

export function lettersFor(optionCount: OptionCount = 4) {
  return LETTERS.slice(0, optionCount);
}

/** "A, B, C e D" ou "A, B, C, D e E", para os prompts. */
export function lettersLabel(optionCount: OptionCount = 4) {
  const letters = lettersFor(optionCount);
  return `${letters.slice(0, -1).join(", ")} e ${letters.at(-1)}`;
}

/** Instrução de formato da resposta da IA, com o número certo de alternativas. */
export function answerFormatInstruction(optionCount: OptionCount = 4) {
  return `options (array com o TEXTO completo de cada uma das ${optionCount} alternativas, na ordem ${lettersLabel(optionCount)}, sem a letra na frente; nunca escreva so a letra), correctAnswer (apenas ${lettersFor(optionCount).join(", ")})`;
}

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

/**
 * Alternativas no formato "A) texto". Sem `optionCount`, mantém quantas vieram (4 ou 5): questões antigas
 * têm 4 e as do estilo ENEM/ETEC têm 5.
 */
export function normalizeQuizOptions(options: unknown, optionCount?: OptionCount) {
  const rawOptions = Array.isArray(options)
    ? options
    : options && typeof options === "object"
      ? LETTERS.map((letter) => (options as Record<string, unknown>)[letter] ?? (options as Record<string, unknown>)[letter.toLowerCase()]).filter((value) => value !== undefined)
      : [];
  const target: OptionCount = optionCount ?? (rawOptions.filter((option) => cleanText(option)).length >= 5 ? 5 : 4);

  const normalized = rawOptions
    .map((option, index) => {
      const text = cleanText(option);
      if (!text) return "";
      const letter = LETTERS[index] ?? "A";
      return /^[A-E][).]\s?/i.test(text) ? text : `${letter}) ${text}`;
    })
    .filter(Boolean)
    .slice(0, target);

  while (normalized.length < target) {
    const letter = LETTERS[normalized.length] ?? "A";
    normalized.push(`${letter}) Alternativa ${letter}`);
  }

  return normalized;
}

/** Texto da alternativa sem a letra do começo ("A) ", "b. "). */
function optionBody(value: unknown) {
  return cleanText(value).replace(/^[A-E]\s*[).:-]\s*/i, "").trim();
}

/**
 * A questão gerada tem enunciado e as alternativas (4 ou 5) de verdade? Recusa alternativa que é só a letra
 * ("A", "B)"), vazia, repetida ou placeholder, enunciado curto demais e gabarito fora das letras pedidas.
 * Questão recusada é pedida de novo (generateQuizQuestions).
 */
export function isUsableGeneratedQuestion(item: unknown, optionCount: OptionCount = 4) {
  const question = (item ?? {}) as Partial<GeneratedQuizQuestion>;
  const text = cleanText(question.question);
  const rawOptions: unknown[] = Array.isArray(question.options) ? question.options : [];
  if (text.length < 15 || isPlaceholderText(text)) return false;
  if (rawOptions.length !== optionCount) return false;
  const bodies = rawOptions.map(optionBody);
  if (bodies.some((body) => !body || /^[A-E]$/i.test(body) || isPlaceholderText(body) || /^alternativa [a-e]$/.test(normalizeForMatch(body)))) return false;
  if (new Set(bodies.map(normalizeForMatch)).size !== optionCount) return false;
  const explanation = cleanText(question.explanation);
  if (!explanation || isPlaceholderText(explanation)) return false;
  const answer = cleanText(question.correctAnswer).toUpperCase().charAt(0);
  return (lettersFor(optionCount) as readonly string[]).includes(answer);
}

export function sanitizeGeneratedQuizQuestions(rawQuestions: unknown, count: number, optionCount: OptionCount = 4) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  return questions
    .filter((item) => isUsableGeneratedQuestion(item, optionCount))
    .slice(0, count)
    .map((item) => {
      const question = item as GeneratedQuizQuestion;
      return {
        question: cleanText(question.question),
        options: normalizeQuizOptions((question.options as unknown[]).map(optionBody), optionCount),
        correctAnswer: normalizeCorrectAnswer(question.correctAnswer),
        explanation: cleanText(question.explanation),
      };
    });
}

export type QuizQuality = {
  /** Conferência às cegas (question-quality.ts): devolve as aprovadas e se a conferência rodou de fato. */
  verify?: (questions: GeneratedQuizQuestion[]) => Promise<{ items: GeneratedQuizQuestion[]; verified: boolean }>;
  /** Questão que não pode entrar (ex.: cópia de uma questão usada como referência). */
  reject?: (question: GeneratedQuizQuestion) => boolean;
  /** Recebe as questões aprovadas pela conferência, para guardar e reaproveitar com outros alunos. */
  onVerified?: (questions: GeneratedQuizQuestion[]) => void;
  /** 4 (padrão) ou 5 alternativas. */
  optionCount?: OptionCount;
};

/**
 * Gera as questões e confere cada uma: primeiro as regras do sistema (enunciado, 4 ou 5 alternativas de verdade,
 * sem repetição), depois a conferência às cegas da IA. O que não passa é pedido de novo, até 2 vezes,
 * antes de aceitar (mínimo de 70%) ou desistir com erro.
 */
export async function generateQuizQuestions(
  count: number,
  generate: (missing: number, round: number) => Promise<unknown[]>,
  quality: QuizQuality = {},
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
    const candidates: GeneratedQuizQuestion[] = [];
    for (const question of sanitizeGeneratedQuizQuestions(raw, missing, quality.optionCount ?? 4)) {
      const key = questionDedupeKey(question);
      if (seen.has(key) || quality.reject?.(question)) continue;
      seen.add(key);
      candidates.push(question);
    }
    const checked = quality.verify ? await quality.verify(candidates) : { items: candidates, verified: false };
    if (checked.verified && checked.items.length) quality.onVerified?.(checked.items);
    accepted.push(...checked.items);
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
export function quizQuestionsSchemaFor(optionCount: OptionCount = 4): Schema {
  return {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING, description: "Enunciado completo da questão." },
        options: {
          type: Type.ARRAY,
          description: `O TEXTO completo das ${optionCount} alternativas, na ordem ${lettersFor(optionCount).join(", ")}. Nunca só a letra.`,
          items: { type: Type.STRING, description: "Texto da alternativa, sem a letra na frente." },
          minItems: String(optionCount),
          maxItems: String(optionCount),
        },
        correctAnswer: { type: Type.STRING, enum: [...lettersFor(optionCount)] },
        explanation: { type: Type.STRING },
      },
      required: ["question", "options", "correctAnswer", "explanation"],
      propertyOrdering: ["question", "options", "correctAnswer", "explanation"],
    },
  };
}

export const quizQuestionsSchema: Schema = quizQuestionsSchemaFor(4);

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

/**
 * Número de alternativas no estilo da prova: ENEM, Vestibulinho da ETEC, Fuvest e as bancas que usam A a E
 * (FCC, Vunesp, FGV, Cesgranrio) têm 5; o resto fica com 4. O texto do estilo vem de exam-style/learner-profile.
 */
export function optionCountForStyle(style: string | null | undefined): OptionCount {
  return /\b(enem|etec|etecs|vestibulinho|fuvest|fcc|vunesp|fgv|cesgranrio)\b/i.test(style ?? "") ? 5 : 4;
}
