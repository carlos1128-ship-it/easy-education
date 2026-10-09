import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { ReviewRunner, type ReviewItem } from "@/components/bank/review-runner";
import { getBookmarkedIds, getReviewQueue, toClientQuestion } from "@/lib/bank/service";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Revisão · Easy Education" };
export const dynamic = "force-dynamic";

export default async function RevisaoPage({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { todas } = await searchParams;
  const includeUpcoming = todas === "1";
  const { dueCount, upcomingCount, rows } = await getReviewQueue(user.id, includeUpcoming);
  const bookmarked = await getBookmarkedIds(user.id, rows.map((row) => row.questionId));

  const items: ReviewItem[] = rows.map((row) => ({
    question: toClientQuestion(row.question, bookmarked.has(row.questionId)),
    correctLabel: row.question.correctLabel,
    explanation: row.question.explanation,
    source: row.source === "marcada" ? "marcada" : "erro",
    easeFactor: row.easeFactor,
    intervalDays: row.intervalDays,
    repetitions: row.repetitions,
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-6">
      <Link href="/dashboard/banco" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Banco de questões
      </Link>
      <header>
        <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
          <RotateCcw className="size-4" aria-hidden="true" /> Revisão espaçada
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Questões para revisar</h1>
        <p className="m-0 mt-2 max-w-[660px] text-[15px] text-ink-muted">
          As questões que você errou ou marcou voltam em intervalos cada vez maiores. Tente lembrar a resposta antes de virar o cartão.
        </p>
        <p className="m-0 mt-3 text-sm text-ink">
          <strong>{dueCount}</strong> para hoje · {upcomingCount} nos próximos dias
          {!includeUpcoming && upcomingCount > 0 ? (
            <>
              {" · "}
              <Link href="/dashboard/revisao?todas=1" className="font-semibold text-brand-strong underline underline-offset-2">
                Revisar também as próximas
              </Link>
            </>
          ) : null}
        </p>
      </header>
      <ReviewRunner key={includeUpcoming ? "todas" : "hoje"} items={items} />
    </div>
  );
}
