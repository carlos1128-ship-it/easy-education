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
        <p className="text-sm font-semibold text-[#4F46E5]">Simulados</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Prática em ritmo de prova</h1>
      </div>

      <SimuladoCreateForm />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Simulados feitos", value: String(completed.length), icon: ClipboardCheck },
          { label: "Média geral", value: `${average}%`, icon: Target },
          { label: "Questões geradas", value: String(simulados.reduce((sum, quiz) => sum + quiz.questionCount, 0)), icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#4F46E5]/10 text-[#4F46E5]">
              <Icon size={20} />
            </div>
            <p className="text-[28px] font-bold leading-none text-[#0F172A]">{value}</p>
            <p className="mt-1 text-[13px] font-medium text-[#64748B]">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[20px] border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] p-5">
          <h2 className="text-lg font-bold text-[#0F172A]">Lista de simulados</h2>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {simulados.length ? simulados.map((exam) => (
            <Link key={exam.id} href={`/dashboard/simulados/${exam.id}`} className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#F8FAFC] sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46E5]">
                <ClipboardCheck size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[#0F172A]">{exam.title}</p>
                <p className="text-sm text-[#64748B]">{exam.questionCount} questões</p>
              </div>
              <span className="w-fit rounded-md bg-[#EEF2FF] px-2.5 py-1 text-xs font-bold text-[#4F46E5]">
                {exam.completedAt ? "Concluido" : "Disponível"}
              </span>
              <span className="text-sm font-semibold text-[#64748B]">{exam.score === null ? "Não iniciado" : `${Math.round(exam.score)}%`}</span>
            </Link>
          )) : (
            <div className="p-5 text-sm text-[#64748B]">Gere seu primeiro simulado com IA usando a area acima.</div>
          )}
        </div>
      </section>
    </div>
  );
}
