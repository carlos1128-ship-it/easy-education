import type { User } from "@supabase/supabase-js";
import type { FeatureKey } from "@/lib/plans";
import { explainOfficialQuestions } from "@/lib/bank/ai";
import { needsOfficialExplanation } from "@/lib/bank/explanation-quality";
import { getPrisma } from "@/lib/prisma";
import { getUsageSnapshot, PlanLimitError, withFeature } from "@/lib/usage";

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
};

/** Preenche explicações ausentes em lotes limitados, debitando questões e custo no teto do aluno. */
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
    select: { id: true, supportText: true, statement: true, options: true, correctLabel: true, explanation: true },
  })) as ExplainableQuestion[];
  const missing = rows.filter((row) => needsOfficialExplanation(row.explanation, row.correctLabel));
  if (!missing.length) return generated;

  try {
    const usage = await getUsageSnapshot(input.user);
    const remaining = usage.features[input.feature].remaining;
    const eligible = remaining === null ? missing : missing.slice(0, remaining ?? 0);

    for (let offset = 0; offset < eligible.length; offset += 5) {
      const batch = eligible.slice(offset, offset + 5);
      const explanations = await withFeature(
        input.user,
        input.feature,
        () => explainOfficialQuestions(batch.map((row) => ({
          text: [row.supportText?.trim(), row.statement.trim()].filter(Boolean).join("\n\n"),
          options: Array.isArray(row.options)
            ? (row.options as Array<{ label?: string; text?: string }>).map((option) => `${option.label ?? ""}) ${option.text ?? ""}`)
            : [],
          correctLabel: row.correctLabel,
        }))),
        { tier: usage.tier, amount: batch.length },
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
    if (!(error instanceof PlanLimitError)) {
      console.error("[bank.explanations]", error instanceof Error ? error.message : error);
    }
  }

  return generated;
}
