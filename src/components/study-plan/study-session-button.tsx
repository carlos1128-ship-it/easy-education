"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalStorageValue } from "@/lib/use-local-storage";

type Props = { subject: string; durationMinutes: number; method: string; notes?: string };

const MAX_MINUTES = 600;

function storageKey({ subject, method, notes }: Props) {
  return `ee-study-timer:${subject}:${method}:${notes ?? ""}`;
}

/**
 * Registra o tempo de estudo de verdade: "Iniciar" marca o começo e "Concluir"
 * envia os minutos que passaram (antes, "Concluir" gravava a duração planejada).
 */
export function StudySessionButton(props: Props) {
  const { subject, durationMinutes, method, notes } = props;
  const router = useRouter();
  const key = storageKey(props);
  // O início fica no localStorage: o cronômetro continua se a página for recarregada.
  const [savedStart, setSavedStart] = useLocalStorageValue(key);
  const startedAt = savedStart && Number.isFinite(Number(savedStart)) ? Number(savedStart) : null;
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const elapsedMinutes = startedAt ? Math.max(0, Math.floor((now - startedAt) / 60000)) : 0;

  function start() {
    const value = Date.now();
    setNow(value);
    setSavedStart(String(value));
  }

  function cancel() {
    setSavedStart(null);
  }

  async function complete() {
    if (!startedAt) return;
    const minutes = Math.min(MAX_MINUTES, Math.max(1, Math.round((Date.now() - startedAt) / 60000)));
    setLoading(true);
    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, durationMinutes: minutes, method, notes }),
    });
    setLoading(false);
    if (!response.ok) {
      toast.error("Não foi possível registrar o estudo.");
      return;
    }
    cancel();
    toast.success(`Estudo registrado: ${minutes} min de ${subject}.`);
    router.refresh();
  }

  if (!startedAt) {
    return (
      <Button variant="outline" size="sm" onClick={start} title={`Bloco planejado: ${durationMinutes} min`}>
        <Play className="size-4" aria-hidden="true" />
        Iniciar
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-brand-strong" aria-live="polite">
        Em andamento · {elapsedMinutes} min
      </span>
      <Button size="sm" disabled={loading} onClick={complete}>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        {loading ? "Salvando..." : "Concluir"}
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={loading} onClick={cancel} aria-label="Cancelar cronômetro">
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
