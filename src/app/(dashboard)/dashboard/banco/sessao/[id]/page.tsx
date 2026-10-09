import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuestionRunner, type RunnerAnswer } from "@/components/bank/question-runner";
import { getBookmarkedIds, getSessionForUser, revealsAfterAnswer, toClientQuestion, toReveal } from "@/lib/bank/service";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Prática · Easy Education" };
export const dynamic = "force-dynamic";

export default async function SessaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { id } = await params;
  const loaded = await getSessionForUser(user.id, id);
  if (!loaded) notFound();
  const { session, questions } = loaded;
  if (session.finishedAt) redirect(`/dashboard/banco/sessao/${id}/resultado`);

  const bookmarked = await getBookmarkedIds(user.id, questions.map((question) => question.id));
  const reveals = revealsAfterAnswer(session.kind);
  const byQuestion = new Map(questions.map((question) => [question.id, question]));
  // Retomar: respostas já dadas voltam preenchidas. Na prática o gabarito reaparece; no simulado continua escondido.
  const initialAnswers: Record<string, RunnerAnswer> = {};
  for (const answer of session.answers) {
    const question = byQuestion.get(answer.questionId);
    initialAnswers[answer.questionId] = { selected: answer.selected, isCorrect: answer.isCorrect, reveal: reveals && question ? toReveal(question) : undefined };
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <Link href={session.kind === "practice" ? "/dashboard/banco" : "/dashboard/banco/simulados"} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Sair (você pode voltar depois)
      </Link>
      <QuestionRunner
        sessionId={session.id}
        kind={session.kind as "practice" | "simulado" | "diagnostic"}
        title={session.title}
        questions={questions.map((question) => toClientQuestion(question, bookmarked.has(question.id)))}
        initialAnswers={initialAnswers}
        startedAtMs={session.startedAt.getTime()}
        timeLimitSec={session.timeLimitSec}
        backHref="/dashboard/banco"
      />
    </div>
  );
}
