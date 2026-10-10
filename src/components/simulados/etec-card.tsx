"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

/** Simulado no formato do Vestibulinho da ETEC (50 questões, 4 horas). Um por dia. */
export function EtecCard({ todayQuizId }: { todayQuizId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (todayQuizId) {
      router.push(`/dashboard/simulados/${todayQuizId}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/simulados/etec", { method: "POST" });
      const data = await readApiJson<{ quizId?: string }>(response, "Não foi possível gerar o simulado.");
      if (!response.ok || !data.quizId) throw new Error(data.error ?? "Não foi possível gerar o simulado.");
      router.push(`/dashboard/simulados/${data.quizId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o simulado.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="m-0 text-sm text-ink-muted">50 questões de A a E, com cronômetro de 4 horas. Leva até um minuto para ficar pronto.</p>
      <Button onClick={open} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Timer className="size-4" aria-hidden="true" />}
        {busy ? "Montando o simulado…" : todayQuizId ? "Continuar o simulado de hoje" : "Fazer o simulado"}
      </Button>
    </div>
  );
}
