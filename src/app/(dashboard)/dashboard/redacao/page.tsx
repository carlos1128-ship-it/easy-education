import { FileEdit } from "lucide-react";
import { EssayCorrectionForm } from "@/components/essay/essay-correction-form";
import { EssayResult } from "@/components/essay/essay-result";
import { UsageHint } from "@/components/plan/usage-hint";
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
    <div className="mx-auto grid w-full max-w-[1680px] gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="m-0 text-sm font-medium text-brand-strong">Redação</p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-ink">Enviar para correção</h1>
        <UsageHint feature="essay_correction" className="mb-1 self-start" />
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-7">
          <EssayCorrectionForm />
        </section>
      </div>

      <aside className="space-y-4">
        {lastEssay ? (
          <EssayResult title={lastEssay.title} score={lastEssay.score ?? 0} feedback={lastEssay.feedback} />
        ) : (
          <EmptyState icon={FileEdit} title="Sua primeira redação está te esperando." description="Envie um texto e receba a nota de cada competência pela grade oficial do Enem." />
        )}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="font-bold text-ink">Histórico</h2>
          <div className="mt-2 divide-y divide-border">
            {essays.map((essay) => (
              <div key={essay.id} className="py-3">
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
