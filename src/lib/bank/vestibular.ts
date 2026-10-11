import { OPTION_LABELS } from "@/lib/bank/constants";
import type { BankOption, NormalizeResult } from "@/lib/bank/import";

/**
 * Questões de vestibulares (FUVEST e UNICAMP) no formato do conjunto acadêmico BLUEX, que transcreve as
 * provas oficiais em PDF. O texto vem com as quebras de linha da diagramação do PDF; aqui elas viram
 * parágrafos, sem mudar as palavras. As imagens são marcadas no texto como [IMAGE n].
 */
export type BluexQuestion = {
  question: string;
  number: number;
  id: string;
  alternatives: string[];
  associated_images: string[];
  answer: string | null;
  alternatives_type: string;
  subject: string[];
};

/** Matéria do BLUEX → matéria do banco (slug) e grande área (como no ENEM). */
export const BLUEX_SUBJECTS: Record<string, { slug: string; area: string }> = {
  portuguese: { slug: "lingua-portuguesa", area: "linguagens" },
  english: { slug: "ingles", area: "linguagens" },
  history: { slug: "historia", area: "ciencias-humanas" },
  geography: { slug: "geografia", area: "ciencias-humanas" },
  philosophy: { slug: "filosofia", area: "ciencias-humanas" },
  physics: { slug: "fisica", area: "ciencias-natureza" },
  chemistry: { slug: "quimica", area: "ciencias-natureza" },
  biology: { slug: "biologia", area: "ciencias-natureza" },
  mathematics: { slug: "matematica", area: "matematica" },
};

const IMAGE_TAG = /\[IMAGE (\d+)\]/g;

/**
 * Junta as linhas quebradas pelo PDF em parágrafos. Linha em branco separa parágrafos; versos (linhas
 * curtas em sequência) mantêm a quebra; espaços repetidos viram um só. Não troca nenhuma palavra.
 */
export function reflowPdfText(raw: string) {
  const paragraphs = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length);

  return paragraphs
    .map((lines) => {
      const average = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
      const verse = lines.length >= 3 && average < 38;
      if (verse) return lines.join("\n");
      return lines.reduce((text, line) => {
        if (!text) return line;
        // Hífen no fim da linha: junta sem espaço e mantém o hífen ("ponham-\nnas" → "ponham-nas").
        if (/[a-záéíóúâêôãõç]-$/i.test(text) && /^[a-záéíóúâêôãõç]/.test(line)) return `${text}${line}`;
        return `${text} ${line}`;
      }, "");
    })
    .join("\n\n");
}

/** Troca [IMAGE n] pela imagem em markdown, cada uma no seu próprio parágrafo. */
export function placeImages(text: string, urls: string[]) {
  return text
    .replace(/[ \t]*\[IMAGE (\d+)\][ \t]*/g, (_, index: string) => {
      const url = urls[Number(index)];
      return url ? `\n\n![Figura da questão](${url})\n\n` : "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "a) texto" → "texto" (a letra vem da posição). */
export function stripOptionLetter(value: string) {
  return value.replace(/^\s*\(?[a-eA-E]\)\s*/, "").trim();
}

/**
 * Converte a questão do BLUEX para o banco. `imageUrl(i)` é a URL pública da i-ésima imagem (o script
 * copia os arquivos para o armazenamento do app). Recusa o que não dá para responder.
 */
export function normalizeBluexQuestion(source: BluexQuestion, imageUrl: (index: number) => string): NormalizeResult & { subjectSlug?: string } {
  const answer = (source.answer ?? "").trim().toUpperCase();
  const alternatives = source.alternatives ?? [];
  if (alternatives.length < 4 || alternatives.length > 5) return { ok: false, reason: "alternativas incompletas" };
  const labels = OPTION_LABELS.slice(0, alternatives.length) as readonly string[];
  if (!labels.includes(answer)) return { ok: false, reason: "sem gabarito (questão anulada ou sem resposta oficial)" };

  const urls = (source.associated_images ?? []).map((_, index) => imageUrl(index));
  const options: BankOption[] = [];
  for (const [index, raw] of alternatives.entries()) {
    const stripped = stripOptionLetter(raw);
    const imageMatch = stripped.match(/^\[IMAGE (\d+)\]$/);
    if (imageMatch) {
      const url = urls[Number(imageMatch[1])];
      if (!url) return { ok: false, reason: "imagem de alternativa faltando" };
      options.push({ label: labels[index], text: "", imageUrl: url });
    } else {
      const text = reflowPdfText(stripped.replace(IMAGE_TAG, ""));
      if (!text) return { ok: false, reason: "alternativa vazia" };
      options.push({ label: labels[index], text, imageUrl: null });
    }
  }

  // Referência a imagem que não existe: a questão não seria resolvível.
  for (const match of source.question.matchAll(IMAGE_TAG)) if (!urls[Number(match[1])]) return { ok: false, reason: "imagem faltando na fonte" };

  const body = placeImages(reflowPdfText(source.question), urls);
  if (!body) return { ok: false, reason: "enunciado vazio" };

  const [exam, year] = source.id.split("_");
  const subject = BLUEX_SUBJECTS[source.subject?.[0] ?? ""];
  if (!exam || !Number(year)) return { ok: false, reason: "identificação da prova inválida" };

  // Texto longo com figura/apoio vai no quadro de apoio; a última frase (a pergunta) fica no enunciado.
  const paragraphs = body.split("\n\n");
  const last = paragraphs.at(-1) ?? "";
  const splitStatement = paragraphs.length > 1 && !last.startsWith("![") && last.length <= 400;
  // Pergunta curta, só texto: fica toda no enunciado.
  if (paragraphs.length === 1 && !last.startsWith("![")) {
    return {
      ok: true,
      subjectSlug: subject?.slug,
      question: { year: Number(year), number: source.number, variant: "", area: subject?.area ?? "", statement: body, supportText: null, images: urls, options, correctLabel: answer },
    };
  }

  return {
    ok: true,
    subjectSlug: subject?.slug,
    question: {
      year: Number(year),
      number: source.number,
      variant: "",
      area: subject?.area ?? "",
      statement: splitStatement ? last : "",
      supportText: splitStatement ? paragraphs.slice(0, -1).join("\n\n") : body,
      images: urls,
      options,
      correctLabel: answer,
    },
  };
}
