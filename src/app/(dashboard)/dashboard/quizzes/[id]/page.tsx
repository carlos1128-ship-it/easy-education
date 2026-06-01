import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  const quiz = await getPrisma().quiz.findFirst({
    where: { id, userId: user.id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">{quiz.subject}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{quiz.title}</h1>
      </div>
      <QuizRunner quizId={quiz.id} questions={quiz.questions} mode={quiz.difficulty === "simulado" ? "simulado" : "quiz"} />
    </div>
  );
}
