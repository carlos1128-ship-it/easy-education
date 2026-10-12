import Link from "next/link";
import { HelpCircle, ListChecks } from "lucide-react";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { ReadyQuizButton } from "@/components/quiz/ready-quiz-button";
import { LockedNotice } from "@/components/plan/usage-hint";
import { EmptyState } from "@/components/ui/empty-state";
import { QuizCreateForm } from "@/components/quiz/quiz-create-form";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export default async function QuizzesPage() {
  const { user, access } = await getStudentOrRedirect();
  const aiLocked = allowanceFor(access.tier, "ai_quiz").kind === "locked";
  const prisma = getPrisma();
  const [quizzes, files, bySubject, subjects] = await Promise.all([
    prisma.quiz.findMany({ where: { userId: user.id, difficulty: { not: "simulado" } }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
    prisma.bankQuestion.groupBy({ by: ["subjectId"], where: { isPublished: true, origin: "prova_oficial", subjectId: { not: null } }, _count: { _all: true } }),
    prisma.bankSubject.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }),
  ]);
  // Quizzes prontos: matérias com questões de provas suficientes (sem IA).
  const readySubjects = subjects
    .map((subject) => ({ ...subject, total: bySubject.find((row) => row.subjectId === subject.id)?._count._all ?? 0 }))
    .filter((subject) => subject.total >= 30);

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
          <QuizCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />
        </div>
      )}

      {readySubjects.length ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6" aria-labelledby="quizzes-prontos">
          <div className="flex flex-col gap-1">
            <h2 id="quizzes-prontos" className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
              <ListChecks className="size-5 text-brand-strong" aria-hidden="true" /> Quizzes prontos
            </h2>
            <p className="m-0 max-w-[760px] text-sm text-ink-muted">10 questões que já caíram no ENEM, com o gabarito oficial. Cada quiz vem com questões diferentes.</p>
          </div>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {readySubjects.map((subject) => (
              <li key={subject.slug} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
                <SubjectIcon slug={subject.slug} className="size-10" size={20} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{subject.name}</span>
                  <span className="text-xs text-ink-muted">{subject.total.toLocaleString("pt-BR")} questões</span>
                </span>
                <ReadyQuizButton subject={subject.name} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {quizzes.length === 0 ? (
        <EmptyState icon={HelpCircle} owl="atenta" title="Você ainda não gerou nenhum quiz." description="Use a IA acima para criar questões e salvar seu progresso." />
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
