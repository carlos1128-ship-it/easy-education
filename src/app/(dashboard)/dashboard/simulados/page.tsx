import Link from "next/link";
import { ClipboardCheck, Clock, Target } from "lucide-react";
import { SimuladoCreateForm } from "@/components/quiz/simulado-create-form";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function SimuladosPage() {
  const user = await getCurrentUserOrRedirect();
  const simulados = await getPrisma().quiz.findMany({
    where: { userId: user.id, difficulty: "simulado" },
    orderBy: { createdAt: "desc" },
  });
  const completed = simulados.filter((item) => item.score !== null);
  const average = completed.length ? Math.round(completed.reduce((sum, quiz) => sum + (quiz.score ?? 0), 0) / completed.length) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Simulados</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Prática em ritmo de prova</h1>
      </div>

      <SimuladoCreateForm />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Simulados feitos", value: String(completed.length), icon: ClipboardCheck },
          { label: "Média geral", value: `${average}%`, icon: Target },
          { label: "Questões geradas", value: String(simulados.reduce((sum, quiz) => sum + quiz.questionCount, 0)), icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-tint text-brand-strong">
              <Icon size={20} />
            </div>
            <p className="text-[28px] font-extrabold leading-none text-brand">{value}</p>
            <p className="mt-1 text-[13px] font-medium text-ink-muted">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-bold text-ink">Lista de simulados</h2>
        </div>
        <div className="divide-y divide-border">
          {simulados.length ? simulados.map((exam) => (
            <Link key={exam.id} href={`/dashboard/simulados/${exam.id}`} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
                <ClipboardCheck size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-ink">{exam.title}</p>
                <p className="text-sm text-ink-muted">{exam.questionCount} questões</p>
              </div>
              <span className="w-fit rounded-md bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-strong">
                {exam.completedAt ? "Concluido" : "Disponível"}
              </span>
              <span className="text-sm font-medium text-ink-muted">{exam.score === null ? "Não iniciado" : `${Math.round(exam.score)}%`}</span>
            </Link>
          )) : (
            <div className="p-5 text-sm text-ink-muted">Gere seu primeiro simulado com IA usando a área acima.</div>
          )}
        </div>
      </section>
    </div>
  );
}
