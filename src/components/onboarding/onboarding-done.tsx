"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

export type OnboardingSummary = {
  goal: string;
  targetDate: string;
  level: string;
  dailyMinutes: number;
  methods: string[];
  subjects: string[];
};

/**
 * Última tela do onboarding: mostra o que ficou configurado e como isso muda o app,
 * e oferece (sem obrigar) um simulado diagnóstico para o ponto de partida do aluno.
 */
export function OnboardingDone({ summary, redo }: { summary: OnboardingSummary; redo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startDiagnostic() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/bank/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "diagnostic", exam: "enem" }) });
      const data = await readApiJson<{ sessionId?: string }>(response, "Não foi possível iniciar o diagnóstico.");
      if (!response.ok || !data.sessionId) throw new Error(data.error ?? "Não foi possível iniciar o diagnóstico.");
      router.push(`/dashboard/banco/sessao/${data.sessionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o diagnóstico.");
      setBusy(false);
    }
  }

  const rows: Array<[string, string]> = [
    ["Objetivo", summary.goal],
    ["Prova ou meta", summary.targetDate ? new Date(`${summary.targetDate}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Sem data definida"],
    ["Tempo disponível", `${Math.round(summary.dailyMinutes / 60 * 10) / 10} h por dia`],
    ["Nível", summary.level],
    ["Jeito de estudar", summary.methods.join(", ") || "Livre"],
    ["Matérias", summary.subjects.join(", ") || "A definir"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-1 size-6 flex-none text-[#166534] dark:text-[#86EFAC]" aria-hidden="true" />
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-950 dark:text-[#F1F5F9]">{redo ? "Personalização atualizada" : "Tudo pronto! Seu estudo está personalizado"}</h2>
          <p className="m-0 mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">Foi isso que você configurou. Você pode mudar quando quiser em Configurações.</p>
        </div>
      </div>

      <dl className="m-0 grid gap-x-6 gap-y-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-[#0D1526] sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">{label}</dt>
            <dd className="m-0 text-slate-950 dark:text-[#F1F5F9]">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <p className="m-0 text-sm font-semibold text-slate-950 dark:text-[#F1F5F9]">Como isso muda o app</p>
        <ul className="m-0 mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-[#94A3B8]">
          <li>As questões geradas por IA seguem o estilo da sua prova e o seu nível.</li>
          <li>O plano da semana respeita seu tempo e os dias em que você pode estudar.</li>
          <li>As explicações usam o jeito de aprender que você escolheu.</li>
          <li>O banco de questões te deixa filtrar por matéria e assunto.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-[#1A2744] sm:flex-row sm:items-center">
        <ClipboardCheck className="size-6 flex-none text-[#1B4FD8] dark:text-[#93C5FD]" aria-hidden="true" />
        <div className="flex-1">
          <p className="m-0 text-sm font-semibold text-slate-950 dark:text-[#F1F5F9]">Simulado diagnóstico (opcional)</p>
          <p className="m-0 mt-0.5 text-sm text-slate-500 dark:text-[#94A3B8]">Poucas questões de provas anteriores de cada área. Serve de ponto de partida para você ver sua evolução nos próximos simulados.</p>
        </div>
        <button type="button" onClick={startDiagnostic} disabled={busy} className="h-10 rounded-lg bg-[#1B4FD8] px-4 text-sm font-medium text-white hover:bg-[#0F2B8A] disabled:opacity-60">
          {busy ? "Preparando..." : "Fazer agora"}
        </button>
      </div>

      <div className="flex justify-end">
        <Link href="/dashboard" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-900 no-underline hover:bg-slate-50 dark:border-[#1A2744] dark:text-[#F1F5F9] dark:hover:bg-[#131D35]">
          Ir para o painel
        </Link>
      </div>
    </div>
  );
}
