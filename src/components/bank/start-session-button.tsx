"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { practiceHref, sessionHref } from "@/lib/bank/paths";
import { readApiJson } from "@/lib/client-response";
import { cn } from "@/lib/utils";

type Body =
  | { kind: "enem"; day: "dia1" | "dia2" | "completo"; language?: "ingles" | "espanhol" }
  | { kind: "diagnostic"; exam: string }
  | { kind: "past"; exam: string; subject?: string; topic?: string; year?: number; edition?: string; day?: 1 | 2 };

/** Cria a sessão (simulado ou diagnóstico) e abre. Sem IA e sem custo. */
export function StartSessionButton({ body, children, className, disabled, busyLabel = "Preparando..." }: { body: Body; children: React.ReactNode; className?: string; disabled?: boolean; busyLabel?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const response = await fetch("/api/bank/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await readApiJson<{ sessionId?: string }>(response, "Não foi possível iniciar.");
      if (!response.ok || !data.sessionId) throw new Error(data.error ?? "Não foi possível iniciar.");
      // Treino de provas anteriores abre no treino (gabarito na hora); o resto, no simulado.
      router.push(body.kind === "past" && !body.year ? practiceHref(data.sessionId) : sessionHref(data.sessionId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy || disabled}
      className={cn("inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-60", className ?? "bg-brand text-on-brand hover:bg-brand-strong")}
    >
      {busy ? busyLabel : children}
    </button>
  );
}
