import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizCreateForm } from "@/components/quiz/quiz-create-form";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function QuizzesPage() {
  const user = await getCurrentUserOrRedirect();
  const prisma = getPrisma();
  const [quizzes, files] = await Promise.all([
    prisma.quiz.findMany({ where: { userId: user.id, difficulty: { not: "simulado" } }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Quizzes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Seus quizzes</h1>
      </div>

      <QuizCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />

      {quizzes.length === 0 ? (
        <EmptyState icon={HelpCircle} title="Você ainda não gerou nenhum quiz." description="Use a IA acima para criar questões e salvar seu progresso." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link
              href={`/dashboard/quizzes/${quiz.id}`}
              key={quiz.id}
              className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition hover:border-[#4F46E5]/30"
            >
              <HelpCircle className="size-6 text-[#4F46E5]" />
              <h2 className="mt-4 font-bold text-[#0F172A]">{quiz.title}</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {quiz.subject} · {quiz.questionCount} questões
              </p>
              <p className="mt-4 text-sm text-[#64748B]">
                {quiz.score === null ? "Não realizado" : `Score ${Math.round(quiz.score)}%`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
