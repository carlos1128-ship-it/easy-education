import { FileEdit } from "lucide-react";
import { EssayCorrectionForm } from "@/components/essay/essay-correction-form";
import { EmptyState } from "@/components/ui/empty-state";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function RedacaoPage() {
  const user = await getCurrentUserOrRedirect();
  const essays = await getPrisma().essay.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const lastEssay = essays[0];

  return (
    <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#4F46E5]">Redacao</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Enviar para correcao</h1>
        <EssayCorrectionForm />
      </section>

      <aside className="space-y-4">
        {lastEssay ? (
          <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <p className="text-sm text-[#64748B]">Ultimo resultado</p>
            <p className="mt-2 text-4xl font-bold text-[#4F46E5]">{Math.round(lastEssay.score ?? 0)}</p>
            <p className="mt-2 text-sm font-semibold text-[#0F172A]">{lastEssay.title}</p>
            <p className="mt-1 text-sm text-[#64748B]">
              {typeof lastEssay.feedback === "object" && lastEssay.feedback && "generalFeedback" in lastEssay.feedback
                ? String(lastEssay.feedback.generalFeedback)
                : "Feedback salvo."}
            </p>
          </div>
        ) : (
          <EmptyState icon={FileEdit} title="Sua primeira redacao esta te esperando." description="Envie um texto e receba nota por criterio." />
        )}
        <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="font-bold text-[#0F172A]">Historico</h2>
          <div className="mt-4 space-y-3">
            {essays.map((essay) => (
              <div key={essay.id} className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-sm font-bold text-[#0F172A]">{essay.title}</p>
                <p className="text-xs text-[#64748B]">{essay.theme} · {Math.round(essay.score ?? 0)} pts</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
