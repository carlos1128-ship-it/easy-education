import { FileEdit } from "lucide-react";
import { EssayCorrectionForm } from "@/components/essay/essay-correction-form";
import { EmptyState } from "@/components/ui/empty-state";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function RedaçãoPage() {
  const user = await getCurrentUserOrRedirect();
  const essays = await getPrisma().essay.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const lastEssay = essays[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <p className="text-sm font-medium text-brand-strong">Redação</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Enviar para correção</h1>
        <EssayCorrectionForm />
      </section>

      <aside className="space-y-4">
        {lastEssay ? (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <p className="text-sm text-ink-muted">Ultimo resultado</p>
            <p className="mt-2 text-4xl font-bold text-brand-strong">{Math.round(lastEssay.score ?? 0)}</p>
            <p className="mt-2 text-sm font-medium text-ink">{lastEssay.title}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {typeof lastEssay.feedback === "object" && lastEssay.feedback && "generalFeedback" in lastEssay.feedback
                ? String(lastEssay.feedback.generalFeedback)
                : "Feedback salvo."}
            </p>
          </div>
        ) : (
          <EmptyState icon={FileEdit} title="Sua primeira redacao esta te esperando." description="Envie um texto e receba nota por critério." />
        )}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="font-bold text-ink">Histórico</h2>
          <div className="mt-4 space-y-3">
            {essays.map((essay) => (
              <div key={essay.id} className="rounded-lg bg-surface-muted p-3">
                <p className="text-sm font-bold text-ink">{essay.title}</p>
                <p className="text-xs text-ink-muted">{essay.theme} · {Math.round(essay.score ?? 0)} pts</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
