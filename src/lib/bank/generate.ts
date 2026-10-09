import { generateQuestionDraft, normalizeDifficulty, solveAndClassify, type GeneratedQuestion } from "@/lib/bank/ai";
import { OPTION_LABELS, ORIGIN, type Difficulty } from "@/lib/bank/constants";
import type { BankOption } from "@/lib/bank/import";
import { BankError, upsertTopic } from "@/lib/bank/service";
import { getLearnerPromptProfile } from "@/lib/exam-style";
import { getPrisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 2;

/** Confere o formato antes de gastar a verificação: 5 alternativas distintas e uma resposta válida. */
export function validateDraft(draft: GeneratedQuestion): string | null {
  if (!draft.statement?.trim() || !draft.supportText?.trim()) return "enunciado ou texto de apoio vazio";
  if (!Array.isArray(draft.options) || draft.options.length !== OPTION_LABELS.length) return "número de alternativas diferente de 5";
  const texts = draft.options.map((option) => String(option ?? "").trim());
  if (texts.some((text) => !text)) return "alternativa vazia";
  if (new Set(texts.map((text) => text.toLowerCase())).size !== texts.length) return "alternativas repetidas";
  if (!(OPTION_LABELS as readonly string[]).includes(draft.correctLabel)) return "gabarito inválido";
  if (!draft.explanation?.trim()) return "sem resolução";
  return null;
}

/**
 * Cria uma questão nova com IA, no estilo do exame, só para o aluno que pediu.
 * Segunda verificação: a IA resolve a questão sem ver o gabarito; se discordar, descarta e tenta de novo.
 * A questão sai sempre marcada como "Gerada por IA" (origin = gerada_ia), nunca como questão de prova.
 */
export async function createAiQuestion(input: { userId: string; examSlug: string; subjectSlug: string; topic?: string; difficulty: Difficulty }) {
  const prisma = getPrisma();
  const [exam, subject] = await Promise.all([
    prisma.exam.findFirst({ where: { slug: input.examSlug, active: true } }),
    prisma.bankSubject.findUnique({ where: { slug: input.subjectSlug } }),
  ]);
  if (!exam) throw new BankError("Exame não encontrado.", 404);
  if (!subject) throw new BankError("Matéria não encontrada.", 404);
  const learner = await getLearnerPromptProfile(input.userId);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const draft = await generateQuestionDraft({
      styleLabel: exam.styleLabel,
      subjectName: subject.name,
      topic: input.topic?.trim() || undefined,
      difficulty: input.difficulty,
      learnerContext: learner.context || undefined,
    });
    const problem = validateDraft(draft);
    if (problem) {
      console.warn(`[bank.generate] tentativa ${attempt} descartada: ${problem}`);
      continue;
    }

    const options: BankOption[] = draft.options.map((text, index) => ({ label: OPTION_LABELS[index], text: text.trim(), imageUrl: null }));
    const check = await solveAndClassify({
      area: subject.area,
      statement: draft.statement.trim(),
      supportText: draft.supportText.trim(),
      options,
      images: [],
      examName: exam.name,
    });
    if (check.answer !== draft.correctLabel) {
      console.warn(`[bank.generate] tentativa ${attempt} descartada: a verificação marcou ${check.answer}, o gabarito era ${draft.correctLabel}`);
      continue;
    }

    const topic = (draft.topic?.trim() || input.topic?.trim()) ? await upsertTopic(subject.id, draft.topic?.trim() || input.topic!.trim()) : null;
    return prisma.bankQuestion.create({
      data: {
        examId: exam.id,
        year: 0,
        // Número só para a chave única; não aparece para o aluno.
        number: Math.floor(Date.now() / 1000),
        area: subject.area,
        statement: draft.statement.trim(),
        supportText: draft.supportText.trim(),
        images: [],
        options,
        correctLabel: draft.correctLabel,
        subjectId: subject.id,
        topicId: topic?.id,
        difficulty: normalizeDifficulty(draft.difficulty) ?? input.difficulty,
        origin: ORIGIN.ai,
        sourceName: "Gerada por IA",
        reviewStatus: "nao_revisada",
        explanation: draft.explanation.trim(),
        explanationStatus: "validada",
        isPublished: true,
        ownerUserId: input.userId,
        importBatch: "ia-aluno",
      },
    });
  }

  throw new Error("A IA retornou uma questão que não passou na verificação. Tente gerar novamente.");
}
