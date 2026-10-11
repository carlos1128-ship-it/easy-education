import type { Prisma } from "@prisma/client";
import { ORIGIN, SEED_SUBJECTS } from "@/lib/bank/constants";
import { pickPreferringUnseen } from "@/lib/bank/enem-simulado";
import { sourceLabel } from "@/lib/bank/labels";
import { parsePersonalization } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";

/**
 * Quiz montado com questões de provas anteriores (banco oficial), sem IA. Serve de reserva quando o limite de IA
 * do aluno acaba ou a IA falha, e também quando o aluno escolhe "questões de provas". Para o aluno é um quiz como
 * qualquer outro; cada questão traz a prova e o ano de onde veio (a licença do INEP pede a fonte).
 *
 * Só entram questões que funcionam no formato do quiz: texto puro, sem figura e sem tabela.
 */

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Palavras do que o aluno escreve → matéria do banco. */
const SUBJECT_WORDS: Array<[RegExp, string]> = [
  [/matemat|algebra|geometr|aritmet|estatistic|probabil|funcao|funcoes|equac|porcentag|trigonometr/, "matematica"],
  [/literatur/, "literatura"],
  [/portugu|gramatic|interpretacao de texto|redacao|lingua portuguesa|leitura/, "lingua-portuguesa"],
  [/ingles|english/, "ingles"],
  [/espanhol|spanish/, "espanhol"],
  [/historia/, "historia"],
  [/geografi/, "geografia"],
  [/filosofi/, "filosofia"],
  [/sociologi/, "sociologia"],
  [/fisica|mecanica|eletric|optica|termolog|ondulatori/, "fisica"],
  [/quimic/, "quimica"],
  [/biologi|citolog|genetic|ecologi|botanic|zoolog|fisiologi/, "biologia"],
  [/\bartes?\b/, "artes"],
];

/** Matérias do banco que o pedido do aluno cobre ("Matemática, Física" → as duas). Vazio se nada bate. */
export function bankSubjectsFor(subject: string, topic?: string | null) {
  const text = normalize(`${subject} ${topic ?? ""}`);
  const found = new Set<string>();
  // Nome exato de uma matéria do banco ("Educação Física", "Tecnologias da Informação").
  for (const part of subject.split(/[,;]/)) {
    const exact = SEED_SUBJECTS.find((item) => normalize(item.name) === normalize(part.trim()));
    if (exact) found.add(exact.slug);
  }
  for (const [pattern, slug] of SUBJECT_WORDS) if (pattern.test(text)) found.add(slug);
  // "Ciências" (Fundamental) = Física, Química e Biologia.
  if (!found.size && /ciencias/.test(text)) ["fisica", "quimica", "biologia"].forEach((slug) => found.add(slug));
  return [...found].filter((slug) => SEED_SUBJECTS.some((item) => item.slug === slug));
}

/** Provas mais próximas do objetivo do aluno, na ordem de preferência. */
function preferredExams(personalization: unknown) {
  const p = parsePersonalization(personalization);
  if (p?.purpose === "etec") return ["etec", "enem"];
  if (p?.purpose === "enem_vestibular" && p.exam === "Fuvest") return ["fuvest", "enem", "unicamp"];
  if (p?.purpose === "enem_vestibular" && p.exam === "Unicamp") return ["unicamp", "enem", "fuvest"];
  if (p?.purpose === "enem_vestibular" && p.exam === "Unesp") return ["unesp", "enem", "fuvest"];
  if (p?.purpose === "escola" && /[6-9]º ano/.test(p.schoolYear ?? "")) return ["etec", "enem"];
  return ["enem", "fuvest", "unicamp", "unesp", "fatec", "etec"];
}

/** A questão cabe no quiz (texto puro)? */
export function fitsQuizFormat(row: { supportText: string | null; statement: string; images: Prisma.JsonValue; options: Prisma.JsonValue }) {
  const text = `${row.supportText ?? ""}\n${row.statement}`;
  if (Array.isArray(row.images) && row.images.length) return false;
  if (/!\[|\n\|.*\|/.test(text)) return false;
  const options = Array.isArray(row.options) ? (row.options as Array<{ text?: string; imageUrl?: string | null }>) : [];
  return options.length >= 4 && options.every((option) => option.text?.trim() && !option.imageUrl);
}

/** Texto da questão no formato do quiz: fonte, apoio e enunciado. */
export function quizTextFor(row: { supportText: string | null; statement: string; year: number; number: number; edition: string; variant: string; origin: string; exam: { name: string; styleLabel: string } }) {
  return [`(${sourceLabel(row)})`, row.supportText?.trim(), row.statement.trim()].filter(Boolean).join("\n\n");
}

export class NoBankQuestionsError extends Error {}

/**
 * Cria o quiz com até `count` questões de provas das matérias pedidas (com o tema, se der). Lança
 * NoBankQuestionsError se não houver pelo menos 3 questões que sirvam.
 */
export async function createQuizFromBank(input: { userId: string; subject: string; topic?: string | null; count: number; difficulty: string; title?: string }) {
  const prisma = getPrisma();
  const slugs = bankSubjectsFor(input.subject, input.topic);
  if (!slugs.length) throw new NoBankQuestionsError("Matéria sem questões de prova no banco.");

  const profile = await prisma.profile.findUnique({ where: { userId: input.userId }, select: { personalization: true } });
  const exams = preferredExams(profile?.personalization);

  const rows = await prisma.bankQuestion.findMany({
    where: { isPublished: true, origin: ORIGIN.official, subject: { slug: { in: slugs } }, exam: { slug: { in: exams } } },
    select: { id: true, supportText: true, statement: true, images: true, options: true, correctLabel: true, explanation: true, year: true, number: true, edition: true, variant: true, origin: true, exam: { select: { slug: true, name: true, styleLabel: true } } },
    take: 4000,
  });
  const usable = rows.filter(fitsQuizFormat);

  // Tema: se o aluno escreveu um tema e há questões suficientes que o citam, ficam só elas.
  const words = normalize(input.topic ?? "").split(/[^a-z0-9]+/).filter((word) => word.length >= 5);
  const onTopic = words.length ? usable.filter((row) => words.some((word) => normalize(`${row.supportText ?? ""} ${row.statement}`).includes(word))) : [];
  const pool = onTopic.length >= Math.min(input.count, 5) ? onTopic : usable;
  if (pool.length < 3) throw new NoBankQuestionsError("Poucas questões de prova para essa matéria.");

  // Prefere a prova do objetivo do aluno e o que ele ainda não viu em quizzes anteriores.
  const seenTexts = new Set(
    (await prisma.quizQuestion.findMany({ where: { quiz: { userId: input.userId } }, select: { question: true }, orderBy: { id: "desc" }, take: 2000 })).map((row) => row.question.slice(0, 120)),
  );
  const seen = new Set(pool.filter((row) => seenTexts.has(quizTextFor(row).slice(0, 120))).map((row) => row.id));
  const ranked = exams.flatMap((exam) => pickPreferringUnseen(pool.filter((row) => row.exam.slug === exam), seen, pool.length));
  const fresh = ranked.filter((row) => !seen.has(row.id));
  const chosen = [...fresh, ...ranked.filter((row) => seen.has(row.id))].slice(0, input.count);

  return prisma.quiz.create({
    data: {
      userId: input.userId,
      title: input.title ?? input.topic ?? `Quiz de ${input.subject}`,
      subject: input.subject,
      difficulty: input.difficulty,
      questionCount: chosen.length,
      questions: {
        create: chosen.map((row, order) => {
          const options = (row.options as Array<{ label: string; text: string }>).map((option) => `${option.label}) ${option.text}`);
          return {
            question: quizTextFor(row),
            options,
            correctAnswer: row.correctLabel,
            explanation: row.explanation?.trim() || `Gabarito oficial da prova: alternativa ${row.correctLabel}.`,
            order,
          };
        }),
      },
    },
  });
}
