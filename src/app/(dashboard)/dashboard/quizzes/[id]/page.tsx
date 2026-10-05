import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getPrisma } from "@/lib/prisma";
import { toQuizRunnerQuestions } from "@/lib/quiz-questions";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  let quiz;
  try {
    quiz = await getPrisma().quiz.findFirst({
      where: { id, userId: user.id },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    console.error("[quiz.detail]", error);
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-danger/40 bg-surface p-6 shadow-card">
        <p className="text-sm font-medium text-danger">Erro ao abrir quiz</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Não foi possível carregar este quiz.</h1>
        <p className="mt-2 text-ink-muted">Tente voltar para a lista e abrir novamente. O erro foi registrado para análise.</p>
      </div>
    );
  }

  if (!quiz) notFound();

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">{quiz.subject}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{quiz.title}</h1>
      </div>
      <QuizRunner quizId={quiz.id} questions={toQuizRunnerQuestions(quiz.questions)} mode={quiz.difficulty === "simulado" ? "simulado" : "quiz"} />
    </div>
  );
}
