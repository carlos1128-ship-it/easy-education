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
      <div className="mx-auto max-w-3xl rounded-[20px] border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-600">Erro ao abrir quiz</p>
        <h1 className="mt-2 text-2xl font-bold text-[#0F172A]">Nao foi possivel carregar este quiz.</h1>
        <p className="mt-2 text-[#64748B]">Tente voltar para a lista e abrir novamente. O erro foi registrado para analise.</p>
      </div>
    );
  }

  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">{quiz.subject}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{quiz.title}</h1>
      </div>
      <QuizRunner quizId={quiz.id} questions={toQuizRunnerQuestions(quiz.questions)} mode={quiz.difficulty === "simulado" ? "simulado" : "quiz"} />
    </div>
  );
}
