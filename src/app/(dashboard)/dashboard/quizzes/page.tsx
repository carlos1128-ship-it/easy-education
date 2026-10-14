import Link from "next/link";
import { ArrowRight, HelpCircle, Library } from "lucide-react";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { LockedNotice } from "@/components/plan/usage-hint";
import { QuizCreateForm } from "@/components/quiz/quiz-create-form";
import { getSubjectSummaries } from "@/lib/bank/tree";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export default async function QuizzesPage() {
  const { user, access } = await getStudentOrRedirect();
  const aiLocked = allowanceFor(access.tier, "ai_quiz").kind === "locked";
  const prisma = getPrisma();
  const [quizzes, files, tree] = await Promise.all([
    prisma.quiz.findMany({ where: { userId: user.id, difficulty: { not: "simulado" } }, orderBy: { createdAt: "desc" } }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
    getSubjectSummaries(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Quizzes</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Seus quizzes</h1>
      </div>

      {tree.length ? (
        <section className="space-y-4 rounded-2xl border-2 border-b-4 border-brand/40 bg-surface p-5 shadow-card lg:p-6" aria-labelledby="por-materia">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="por-materia" className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
                <Library className="size-5 text-brand-strong" aria-hidden="true" /> Quiz por assunto
              </h2>
              <p className="m-0 max-w-[760px] text-sm text-ink-muted">Escolha a matéria, a unidade e o assunto. O treino abre na hora.</p>
            </div>
            <Link href="/dashboard/materias" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong no-underline hover:underline">
              Ver todas <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 lg:grid-cols-5">
            {tree.map((subject) => (
              <li key={subject.slug}>
                <Link
                  href={`/dashboard/materias/${subject.slug}`}
                  className="flex h-full items-center gap-2.5 rounded-xl border border-border border-b-4 bg-background p-3 no-underline transition-all hover:-translate-y-0.5 hover:border-brand"
                >
                  <SubjectIcon slug={subject.slug} className="size-9" size={18} />
                  <span className="min-w-0 truncate text-sm font-semibold text-ink">{subject.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      {quizzes.length > 0 ? (
        <details className="rounded-2xl border border-border bg-surface p-5">
          <summary className="cursor-pointer font-semibold text-ink">Histórico de quizzes</summary>
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
                {quiz.subject}
              </p>
              <p className="mt-4 text-sm text-ink-muted">
                {quiz.score === null ? "Não realizado" : `Score ${Math.round(quiz.score)}%`}
              </p>
            </Link>
          ))}
        </div>
        </details>
      ) : null}
    </div>
  );
}
