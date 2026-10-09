"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";
import { studyBlockId, useActiveStudy } from "@/lib/active-study";

type Props = {
  subject: string;
  durationMinutes: number;
  method: string;
  notes?: string;
  type?: "estudo" | "revisao" | "simulado" | "redacao";
};

const activityLabel: Record<string, string> = {
  redacao: "Abrindo a redação",
  simulado: "Simulado pronto",
  flashcards: "Flashcards prontos",
  quiz: "Quiz pronto",
  banco: "Questões de provas anteriores prontas",
};

/**
 * "Iniciar" liga o cronômetro do canto e leva o aluno para a atividade do bloco:
 * redação abre a tela de redação; os demais geram simulado, flashcards ou quiz.
 * O tempo é registrado em "Concluir", no cronômetro.
 */
export function StudySessionButton({ subject, durationMinutes, method, notes, type = "estudo" }: Props) {
  const router = useRouter();
  const { active, setActive } = useActiveStudy();
  const [preparing, setPreparing] = useState(false);
  const topic = notes ?? "";
  const isThisBlock = active ? studyBlockId(active) === studyBlockId({ subject, topic, method }) : false;

  async function start() {
    if (active && !isThisBlock && !window.confirm(`Você já está estudando ${active.subject}. Trocar para ${subject}? O tempo anterior não será registrado.`)) return;

    const base = { subject, topic, method, type, plannedMinutes: durationMinutes, startedAt: Date.now() };
    setActive(base);
    setPreparing(true);
    try {
      const response = await fetch("/api/study-plan/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, method, type }),
      });
      const data = await readApiJson<{ href?: string; activity?: string; error?: string }>(response, "Não foi possível preparar a atividade.");
      if (!response.ok || !data.href) {
        toast.error(`${data.error ?? "Não foi possível preparar a atividade."} O cronômetro continua rodando.`);
        return;
      }
      setActive({ ...base, href: data.href });
      toast.success(activityLabel[data.activity ?? ""] ?? "Atividade pronta");
      router.push(data.href);
    } finally {
      setPreparing(false);
    }
  }

  if (isThisBlock && !preparing) {
    return (
      <Button variant="outline" size="sm" onClick={() => active?.href && router.push(active.href)} disabled={!active?.href}>
        <Timer className="size-4" aria-hidden="true" />
        Em andamento
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={start} disabled={preparing} title={`Bloco planejado: ${durationMinutes} min`}>
      {preparing ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
      {preparing ? "Preparando…" : "Iniciar"}
    </Button>
  );
}
