import { OPTION_LABELS } from "@/lib/bank/constants";

/** Formato de uma questão na API pública enem.dev (transcrição das provas do INEP). */
export type EnemDevQuestion = {
  title: string;
  index: number;
  discipline: string;
  language: string | null;
  year: number;
  context: string | null;
  files: string[];
  correctAlternative: string | null;
  alternativesIntroduction: string | null;
  alternatives: Array<{ letter: string; text: string | null; file: string | null; isCorrect: boolean }>;
};

export type BankOption = { label: string; text: string; imageUrl: string | null };

export type NormalizedQuestion = {
  year: number;
  number: number;
  variant: string;
  area: string;
  statement: string;
  supportText: string | null;
  images: string[];
  options: BankOption[];
  correctLabel: string;
};

export type NormalizeResult = { ok: true; question: NormalizedQuestion } | { ok: false; reason: string };

/** A fonte (enem.dev) troca imagem que não conseguiu extrair da prova por uma figura "This image is broken" (status 200). */
export function isBrokenImageUrl(url: string) {
  return /broken-image/i.test(url);
}

const IMAGE_IN_MARKDOWN = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;

/** Todas as imagens da questão (enunciado, texto de apoio e alternativas), sem repetir. */
export function collectImages(question: Pick<EnemDevQuestion, "context" | "files" | "alternatives">): string[] {
  const urls = new Set<string>(question.files ?? []);
  for (const match of (question.context ?? "").matchAll(IMAGE_IN_MARKDOWN)) urls.add(match[1]);
  for (const alternative of question.alternatives ?? []) if (alternative.file) urls.add(alternative.file);
  return [...urls];
}

/**
 * Converte a questão da fonte para o formato do banco SEM alterar o texto: enunciado e alternativas
 * entram como vieram (a licença CC BY-ND não permite modificar o conteúdo). Só rejeita o que está incompleto.
 */
export function normalizeEnemDevQuestion(source: EnemDevQuestion): NormalizeResult {
  const options: BankOption[] = (source.alternatives ?? []).map((alternative) => ({
    label: String(alternative.letter ?? "").trim().toUpperCase(),
    text: (alternative.text ?? "").trim(),
    imageUrl: alternative.file ?? null,
  }));

  if (options.length !== OPTION_LABELS.length || options.some((option, index) => option.label !== OPTION_LABELS[index])) {
    return { ok: false, reason: "alternativas incompletas (esperado A a E)" };
  }
  if (options.some((option) => !option.text && !option.imageUrl)) return { ok: false, reason: "alternativa vazia" };

  const correct = (source.correctAlternative ?? "").trim().toUpperCase();
  if (!OPTION_LABELS.includes(correct as (typeof OPTION_LABELS)[number])) return { ok: false, reason: "sem gabarito (questão anulada ou sem resposta oficial)" };

  const images = collectImages(source);
  if (images.some(isBrokenImageUrl)) return { ok: false, reason: "imagem faltando na fonte (figura quebrada)" };

  const statement = (source.alternativesIntroduction ?? "").trim();
  const supportText = (source.context ?? "").trim() || null;
  if (!statement && !supportText) return { ok: false, reason: "enunciado vazio" };

  return {
    ok: true,
    question: {
      year: source.year,
      number: source.index,
      variant: (source.language ?? "").trim().toLowerCase(),
      area: source.discipline,
      statement,
      supportText,
      images,
      options,
      correctLabel: correct,
    },
  };
}
