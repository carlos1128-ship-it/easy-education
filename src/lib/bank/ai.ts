import { Type, type Schema } from "@google/genai";
import { DIFFICULTIES, OPTION_LABELS, SEED_SUBJECTS, type Difficulty } from "@/lib/bank/constants";
import type { BankOption } from "@/lib/bank/import";
import { generateJSON } from "@/lib/gemini";

/** Questão como a IA enxerga: sem o gabarito, para ela resolver "às cegas". */
export type QuestionForAI = {
  area: string | null;
  statement: string;
  supportText: string | null;
  options: BankOption[];
  images: string[];
  examName: string;
};

export type SolveResult = {
  explanation: string;
  answer: string;
  subject: string;
  topic: string;
  subtopic: string;
  skill: string;
  difficulty: Difficulty;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 8;

/** Baixa as imagens da questão para a IA enxergar (gráficos, figuras, alternativas em imagem). */
export async function fetchImageParts(urls: string[]) {
  const parts: Array<{ mimeType: string; data: string }> = [];
  for (const url of urls.slice(0, MAX_IMAGES)) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) continue;
      const mimeType = (response.headers.get("content-type") ?? "image/png").split(";")[0].trim();
      if (!mimeType.startsWith("image/")) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_IMAGE_BYTES) continue;
      parts.push({ mimeType, data: buffer.toString("base64") });
    } catch {
      // Imagem indisponível: a questão segue sem ela (a importação já registra imagens quebradas).
    }
  }
  return parts;
}

function subjectsForArea(area: string | null) {
  const inArea = SEED_SUBJECTS.filter((subject) => subject.area === area);
  return inArea.length ? inArea : SEED_SUBJECTS;
}

function renderQuestion(question: QuestionForAI) {
  const options = question.options.map((option) => `${option.label}) ${option.text || "(alternativa em imagem, veja as imagens anexadas)"}`).join("\n");
  return `${question.supportText ? `TEXTO DE APOIO:\n${question.supportText}\n\n` : ""}ENUNCIADO: ${question.statement || "(veja o texto de apoio)"}\n\nALTERNATIVAS:\n${options}`;
}

function solveSchema(subjectSlugs: string[]): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      explanation: { type: Type.STRING },
      answer: { type: Type.STRING, enum: [...OPTION_LABELS] },
      subject: { type: Type.STRING, enum: subjectSlugs },
      topic: { type: Type.STRING },
      subtopic: { type: Type.STRING },
      skill: { type: Type.STRING },
      difficulty: { type: Type.STRING, enum: [...DIFFICULTIES] },
    },
    required: ["explanation", "answer", "subject", "topic", "subtopic", "skill", "difficulty"],
    propertyOrdering: ["explanation", "answer", "subject", "topic", "subtopic", "skill", "difficulty"],
  };
}

/**
 * A IA resolve a questão SEM ver o gabarito e a classifica. Quem compara a resposta dela com o gabarito
 * oficial é quem chama: se divergir, a questão não é publicada.
 */
export async function solveAndClassify(question: QuestionForAI, knownTopics: string[] = []): Promise<SolveResult> {
  const subjects = subjectsForArea(question.area);
  const images = question.images.length ? await fetchImageParts(question.images) : [];
  const prompt = `Você é professor experiente de cursinho e vai analisar uma questão do ${question.examName}.
${images.length ? "As imagens anexadas fazem parte da questão (figuras, gráficos ou alternativas em imagem), na ordem em que aparecem.\n" : ""}
${renderQuestion(question)}

Faça o seguinte, nesta ordem:
1) explanation: resolução comentada em português do Brasil, passo a passo, em até 8 frases. Mostre o raciocínio que leva à alternativa correta e diga em uma frase curta por que cada uma das outras está errada. Texto simples, sem markdown, sem emojis. Não mencione "gabarito" nem que você é uma IA.
2) answer: a letra da alternativa que você considera correta, resolvendo a questão por conta própria.
3) subject: a matéria da questão, escolhendo UMA das opções permitidas.
4) topic: o assunto principal em até 4 palavras${knownTopics.length ? `, preferindo um destes já cadastrados quando servir: ${knownTopics.join("; ")}` : ""}.
5) subtopic: o subassunto específico, em até 6 palavras.
6) skill: a competência e habilidade da matriz do ENEM no formato "C5 H21" se você tiver certeza; senão, deixe vazio.
7) difficulty: facil, medio ou dificil, pelo que a questão exige de um aluno do ensino médio.`;

  return generateJSON<SolveResult>(prompt, {
    schema: solveSchema(subjects.map((subject) => subject.slug)),
    thinkingBudget: 4096,
    temperature: 0.1,
    attemptTimeoutMs: 90_000,
    images,
  });
}

export type GeneratedQuestion = {
  statement: string;
  supportText: string;
  options: string[];
  correctLabel: string;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
};

const generatedSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    supportText: { type: Type.STRING },
    statement: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING } },
    correctLabel: { type: Type.STRING, enum: [...OPTION_LABELS] },
    explanation: { type: Type.STRING },
    topic: { type: Type.STRING },
    difficulty: { type: Type.STRING, enum: [...DIFFICULTIES] },
  },
  required: ["supportText", "statement", "options", "correctLabel", "explanation", "topic", "difficulty"],
  propertyOrdering: ["supportText", "statement", "options", "correctLabel", "explanation", "topic", "difficulty"],
};

/** Gera uma questão nova no estilo do exame. A verificação (resolver às cegas) é feita por `createAiQuestion`. */
export async function generateQuestionDraft(input: {
  styleLabel: string;
  subjectName: string;
  topic?: string;
  difficulty: Difficulty;
  learnerContext?: string;
}): Promise<GeneratedQuestion> {
  const prompt = `Crie UMA questão inédita de múltipla escolha de ${input.subjectName}${input.topic ? `, sobre "${input.topic}"` : ""}, no estilo do ${input.styleLabel}, com dificuldade ${input.difficulty}.
Regras obrigatórias:
- supportText: um texto de apoio curto e original (situação do cotidiano, dado, trecho autoral, descrição de experimento ou situação-problema) que a questão realmente usa. Não copie nem atribua o texto a autores, obras ou instituições reais, e não cite "adaptado de".
- statement: a pergunta, objetiva, que só dá para responder lendo o texto de apoio e aplicando o conteúdo.
- options: exatamente 5 alternativas (A a E) em texto, concretas e plausíveis, sem "todas as anteriores" e sem placeholders. Só UMA correta.
- correctLabel: a letra da alternativa correta (varie a posição).
- explanation: resolução comentada em até 6 frases dizendo por que a correta está certa e por que as outras estão erradas. Texto simples, sem markdown.
- topic: o assunto em até 4 palavras.
- A questão deve ter uma única resposta defensável e não pode depender de imagem.${input.learnerContext ? `\nPerfil do aluno (ajuste a contextualização, não o rigor):\n${input.learnerContext}` : ""}`;

  return generateJSON<GeneratedQuestion>(prompt, { schema: generatedSchema, thinkingBudget: 2048, temperature: 0.7, attemptTimeoutMs: 75_000 });
}

export function normalizeDifficulty(value: string | null | undefined): Difficulty | null {
  return (DIFFICULTIES as readonly string[]).includes(value ?? "") ? (value as Difficulty) : null;
}
