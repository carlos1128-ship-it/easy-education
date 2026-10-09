import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Library, Sparkles } from "lucide-react";
import { GenerateQuestionForm } from "@/components/bank/generate-question-form";
import { LockedNotice, UsageHint } from "@/components/plan/usage-hint";
import { SEED_EXAMS } from "@/lib/bank/constants";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Gerar questão com IA · Easy Education" };
export const dynamic = "force-dynamic";

export default async function GerarQuestaoPage() {
  const { access } = await getStudentOrRedirect();
  const locked = allowanceFor(access.tier, "ai_question").kind === "locked";
  const prisma = getPrisma();
  const [exams, subjects] = await Promise.all([
    prisma.exam.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.bankSubject.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6">
      <Link href="/dashboard/banco" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Banco de questões
      </Link>
      <header>
        <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
          <Sparkles className="size-4" aria-hidden="true" /> Questão nova com IA
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Pratique um tema do seu jeito</h1>
        <p className="m-0 mt-2 text-[15px] text-ink-muted">
          Não achou o que queria no banco? A IA cria uma questão inédita no estilo da prova, com gabarito e resolução. Ela aparece sempre com o selo &ldquo;Gerada por IA&rdquo;; nunca como questão real de prova.
        </p>
      </header>

      {locked ? (
        <LockedNotice feature="ai_question" title="Questões novas geradas por IA fazem parte dos planos pagos" description="No plano Gratuito você usa o banco de questões de provas anteriores, que não tem custo de IA.">
          <Link href="/dashboard/banco" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand no-underline hover:bg-brand-strong">
            <Library size={15} aria-hidden="true" /> Ir ao banco
          </Link>
        </LockedNotice>
      ) : (
        <div className="space-y-3">
          <UsageHint feature="ai_question" />
          <GenerateQuestionForm exams={exams} subjects={subjects} defaultExam={exams[0]?.slug ?? SEED_EXAMS[0].slug} />
        </div>
      )}
    </div>
  );
}
