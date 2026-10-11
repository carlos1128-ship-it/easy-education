"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

/** Monta um quiz pronto da matéria (questões de provas, sem IA) e abre. */
export function ReadyQuizButton({ subject, count = 10 }: { subject: string; count?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, difficulty: "medio", questionCount: count, source: "provas" }),
      });
      const data = await readApiJson<{ quizId?: string }>(response, "Não foi possível montar o quiz.");
      if (!response.ok || !data.quizId) throw new Error(data.error ?? "Não foi possível montar o quiz.");
      router.push(`/dashboard/quizzes/${data.quizId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível montar o quiz.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="inline-flex min-h-9 flex-none items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60"
    >
      <Play size={14} aria-hidden="true" /> {busy ? "Montando…" : "Fazer"}
    </button>
  );
}
