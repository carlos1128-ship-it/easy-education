import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getPrisma } from "@/lib/prisma";
import { toQuizRunnerQuestions } from "@/lib/quiz-questions";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function SimuladoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  let simulado;
  try {
    simulado = await getPrisma().quiz.findFirst({
      where: { id, userId: user.id, difficulty: "simulado" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  } catch (error) {
    console.error("[simulado.detail]", error);
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-danger/40 bg-surface p-6 shadow-card">
        <p className="text-sm font-medium text-danger">Erro ao abrir simulado</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Não foi possível carregar este simulado.</h1>
        <p className="mt-2 text-ink-muted">Tente voltar para a lista e abrir novamente. O erro foi registrado para análise.</p>
      </div>
    );
  }

  if (!simulado) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">{simulado.subject}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{simulado.title}</h1>
      </div>
      <QuizRunner quizId={simulado.id} questions={toQuizRunnerQuestions(simulado.questions)} mode="simulado" />
    </div>
  );
}
