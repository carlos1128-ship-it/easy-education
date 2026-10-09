import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuestionRunner, type RunnerAnswer } from "@/components/bank/question-runner";
import { getPrisma } from "@/lib/prisma";
import { getQuestionForUser, toReveal } from "@/lib/bank/service";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Questão · Easy Education" };
export const dynamic = "force-dynamic";

/** Uma questão avulsa (da lista do banco ou gerada por IA). Mostra o gabarito e a resolução ao confirmar. */
export default async function QuestaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { id } = await params;
  const found = await getQuestionForUser(user.id, id);
  if (!found) notFound();

  // Se o aluno já respondeu esta questão, mostra a última resposta com a resolução.
  const last = await getPrisma().bankAnswer.findFirst({ where: { userId: user.id, questionId: id }, orderBy: { answeredAt: "desc" } });
  const initial: Record<string, RunnerAnswer> = last ? { [id]: { selected: last.selected, isCorrect: last.isCorrect, reveal: toReveal(found.row) } } : {};

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Link href="/dashboard/banco" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao banco
      </Link>
      <QuestionRunner kind="practice" title="Questão avulsa" questions={[found.question]} initialAnswers={initial} backHref="/dashboard/banco" />
    </div>
  );
}
