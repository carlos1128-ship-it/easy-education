import type { User } from "@supabase/supabase-js";
import type { FeatureKey } from "@/lib/plans";
import { explainOfficialQuestions } from "@/lib/bank/ai";
import { needsOfficialExplanation } from "@/lib/bank/explanation-quality";
import { getPrisma } from "@/lib/prisma";
import { assertWithinSafetyCaps, requireTier } from "@/lib/usage";
import { runWithAiCallContext } from "@/lib/ai-cost";

export { EXPLANATION_UNAVAILABLE, needsOfficialExplanation } from "@/lib/bank/explanation-quality";

type ExplanationFeature = Extract<FeatureKey, "ai_quiz" | "ai_simulado">;
type UserRef = Pick<User, "id" | "email">;

type ExplainableQuestion = {
  id: string;
  supportText: string | null;
  statement: string;
  options: unknown;
  correctLabel: string;
  explanation: string | null;
  images?: unknown;
};

/** Preenche explicações ausentes em lotes limitados, respeitando o teto de custo do aluno. */
export async function ensureOfficialQuestionExplanations(input: {
  questionIds: string[];
  user: UserRef;
  feature: ExplanationFeature;
}) {
  const generated = new Map<string, string>();
  if (!input.questionIds.length) return generated;

  const prisma = getPrisma();
  const rows = (await prisma.bankQuestion.findMany({
    where: { id: { in: [...new Set(input.questionIds)] }, origin: "prova_oficial" },
    select: { id: true, supportText: true, statement: true, options: true, correctLabel: true, explanation: true, images: true },
  })) as ExplainableQuestion[];
  const missing = rows.filter((row) => needsOfficialExplanation(row.explanation, row.correctLabel));
  if (!missing.length) return generated;

  try {
    // A devolutiva faz parte da questão e não consome a cota de criação de quizzes.
    const tier = await requireTier(input.user);
    await assertWithinSafetyCaps(input.user, { tier });
    const eligible = missing;

    for (let offset = 0; offset < eligible.length; offset += 5) {
      const batch = eligible.slice(offset, offset + 5);
      const explanations = await runWithAiCallContext(
        { userId: input.user.id, plan: tier, feature: "official_explanation" },
        () => explainOfficialQuestions(batch.map((row) => ({
          text: [row.supportText?.trim(), row.statement.trim()].filter(Boolean).join("\n\n"),
          options: Array.isArray(row.options)
            ? (row.options as Array<{ label?: string; text?: string }>).map((option) => `${option.label ?? ""}) ${option.text ?? ""}`)
            : [],
          correctLabel: row.correctLabel,
          images: [
            ...(Array.isArray(row.images) ? row.images.filter((image): image is string => typeof image === "string") : []),
            ...(Array.isArray(row.options) ? (row.options as Array<{ imageUrl?: string }>).map((option) => option.imageUrl).filter((image): image is string => !!image) : []),
          ],
        }))),
      );

      await Promise.all(batch.map(async (row, index) => {
        const explanation = explanations[index];
        if (!explanation) return;
        generated.set(row.id, explanation);
        await prisma.bankQuestion.updateMany({
          where: { id: row.id, explanation: row.explanation },
          data: { explanation },
        });
      }));
    }
  } catch (error) {
    console.error("[bank.explanations]", error instanceof Error ? error.message : error);
  }

  return generated;
}
