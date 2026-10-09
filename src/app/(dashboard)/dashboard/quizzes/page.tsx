import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { LockedNotice, UsageHint } from "@/components/plan/usage-hint";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizCreateForm } from "@/components/quiz/quiz-create-form";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export default async function QuizzesPage() {
  const { user, access } = await getStudentOrRedirect();
  const aiLocked = allowanceFor(access.tier, "ai_quiz").kind === "locked";
  const prisma = getPrisma();
  const [quizzes, files] = await Promise.all([
    prisma.quiz.findMany({ where: { userId: user.id, difficulty: { not: "simulado" } }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Quizzes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Seus quizzes</h1>
      </div>

      {aiLocked ? (
        <LockedNotice
          feature="ai_quiz"
          title="Quizzes gerados por IA fazem parte dos planos pagos"
          description="Para gerar quizzes com explicação sobre qualquer assunto ou material seu, escolha um plano pago."
        />
      ) : (
        <div className="space-y-3">
          <UsageHint feature="ai_quiz" />
          <QuizCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />
        </div>
      )}

      {quizzes.length === 0 ? (
        <EmptyState icon={HelpCircle} title="Você ainda não gerou nenhum quiz." description="Use a IA acima para criar questões e salvar seu progresso." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {quizzes.map((quiz) => (
            <Link
              href={`/dashboard/quizzes/${quiz.id}`}
              key={quiz.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-border-strong"
            >
              <HelpCircle className="size-6 text-brand-strong" />
              <h2 className="mt-4 font-bold text-ink">{quiz.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {quiz.subject} · {quiz.questionCount} questões
              </p>
              <p className="mt-4 text-sm text-ink-muted">
                {quiz.score === null ? "Não realizado" : `Score ${Math.round(quiz.score)}%`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
