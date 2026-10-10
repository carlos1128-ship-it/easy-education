import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { ETEC_EXAM, ETEC_SIMULADO_TITLE } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { toQuizRunnerQuestions } from "@/lib/quiz-questions";
import { getCurrentUserOrRedirect } from "@/lib/server-user";
import { parseVideoSourceKey } from "@/lib/youtube";

export default async function SimuladoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  let simulado;
  try {
    simulado = await getPrisma().quiz.findFirst({
      where: { id, userId: user.id, difficulty: "simulado" },
      include: { questions: { orderBy: { order: "asc" } }, file: { select: { sourceUrl: true } } },
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
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-strong">
          {simulado.subject}
          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-muted">Gerado por IA</span>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{simulado.title}</h1>
        <p className="m-0 mt-1 text-sm text-ink-muted">Questões criadas pela IA no estilo da sua prova. Não são questões de provas anteriores.</p>
      </div>
      <QuizRunner quizId={simulado.id} questions={toQuizRunnerQuestions(simulado.questions)} mode="simulado"
        videoId={parseVideoSourceKey(simulado.file?.sourceUrl)?.id ?? null}
        timeLimit={simulado.title === ETEC_SIMULADO_TITLE ? { minutes: ETEC_EXAM.minutes, startedAt: simulado.createdAt.toISOString() } : null}
      />
    </div>
  );
}
