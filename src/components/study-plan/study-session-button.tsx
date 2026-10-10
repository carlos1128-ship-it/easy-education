"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { notifyStudyRunChanged } from "@/components/study-plan/study-run-provider";
import { readApiJson } from "@/lib/client-response";
import type { BlockStatus } from "@/lib/study-completion";

type Props = {
  subject: string;
  durationMinutes: number;
  method: string;
  notes?: string;
  type?: "estudo" | "revisao" | "simulado" | "redacao";
  /** Estado do bloco hoje, lido do servidor. */
  status?: BlockStatus;
};

const activityLabel: Record<string, string> = {
  redacao: "Abrindo a redação",
  simulado: "Simulado pronto",
  flashcards: "Flashcards prontos",
  quiz: "Quiz pronto",
  banco: "Questões de provas anteriores prontas",
};

/**
 * Botão do bloco de hoje. Pendente: "Iniciar" liga o cronômetro e gera a atividade (uma vez por dia).
 * Em andamento: "Continuar" reabre a mesma atividade, sem gerar outra. Concluído: só o selo, sem botão.
 */
export function StudySessionButton({ subject, durationMinutes, method, notes, type = "estudo", status = "pendente" }: Props) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);

  if (status === "concluido") {
    return (
      <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-success-tint px-3 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Concluído
      </span>
    );
  }

  async function start() {
    setPreparing(true);
    try {
      const response = await fetch("/api/study-plan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic: notes ?? "", method, type }),
      });
      const data = await readApiJson<{ href?: string; activity?: string; reused?: boolean }>(response, "Não foi possível preparar a atividade.");
      if (!response.ok || !data.href) {
        toast.error(data.error ?? "Não foi possível preparar a atividade.");
        // 409: o bloco já foi concluído (ou está sendo preparado em outra aba). Atualiza o plano.
        if (response.status === 409) router.refresh();
        return;
      }
      notifyStudyRunChanged();
      toast.success(data.reused ? "Continuando de onde você parou" : (activityLabel[data.activity ?? ""] ?? "Atividade pronta"));
      router.push(data.href);
      router.refresh();
    } catch {
      toast.error("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setPreparing(false);
    }
  }

  const resume = status === "em_andamento";
  const Icon = preparing ? Loader2 : resume ? RotateCcw : Play;
  return (
    <Button variant={resume ? "default" : "outline"} size="sm" onClick={start} disabled={preparing} title={`Bloco planejado: ${durationMinutes} min`}>
      <Icon className={preparing ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
      {preparing ? "Preparando…" : resume ? "Continuar" : "Iniciar"}
    </Button>
  );
}
