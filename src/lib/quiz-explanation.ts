import type { User } from "@supabase/supabase-js";
import { explainOfficialQuestions } from "@/lib/bank/ai";
import { needsOfficialExplanation } from "@/lib/bank/explanation-quality";
import { BankError } from "@/lib/bank/service";
import { assertWithinSafetyCaps, requireTier } from "@/lib/usage";
import { runWithAiCallContext } from "@/lib/ai-cost";
import { getPrisma } from "@/lib/prisma";

/** Repara questões antigas antes da confirmação. Nunca substitui uma resolução por texto genérico. */
export async function requireQuizExplanation(question: { id: string; question: string; options: unknown; correctAnswer: string; explanation: string }, user: Pick<User, "id" | "email">) {
  if (!needsOfficialExplanation(question.explanation, question.correctAnswer)) return question.explanation;
  const tier = await requireTier(user);
  await assertWithinSafetyCaps(user, { tier });
  const [explanation] = await runWithAiCallContext({ userId: user.id, plan: tier, feature: "question_explanation" }, () => explainOfficialQuestions([{
    text: question.question,
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    correctLabel: question.correctAnswer,
  }]));
  if (!explanation) throw new BankError("Não foi possível preparar a explicação. Tente confirmar novamente em instantes.", 503);
  await getPrisma().quizQuestion.updateMany({ where: { id: question.id, explanation: question.explanation }, data: { explanation } });
  return explanation;
}
