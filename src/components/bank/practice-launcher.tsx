"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

type Filters = { exam?: string; year?: number; area?: string; subject?: string; topic?: string; difficulty?: string; status?: string };

/** Começa uma prática com os filtros da tela: sorteia questões e abre uma por uma, com gabarito na hora. */
export function PracticeLauncher({ filters, available }: { filters: Filters; available: number }) {
  const router = useRouter();
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy || available === 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/bank/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "practice", filters, count }),
      });
      const data = await readApiJson<{ sessionId?: string }>(response, "Não foi possível iniciar a prática.");
      if (!response.ok || !data.sessionId) throw new Error(data.error ?? "Não foi possível iniciar a prática.");
      router.push(`/dashboard/banco/sessao/${data.sessionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a prática.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="practice-count" className="text-[13px] font-medium text-ink-muted">
          Quantas questões
        </label>
        <select
          id="practice-count"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className="h-11 rounded-lg border border-border-strong bg-surface px-3 text-[15px] text-ink"
        >
          {[5, 10, 15, 20, 30].map((value) => (
            <option key={value} value={value}>
              {value} questões
            </option>
          ))}
        </select>
      </div>
      <Button onClick={start} disabled={busy || available === 0} className="gap-2">
        <Play className="size-4" aria-hidden="true" />
        {busy ? "Preparando..." : "Praticar com estes filtros"}
      </Button>
      <p className="m-0 pb-2.5 text-[13px] text-ink-muted">{available} questão{available === 1 ? "" : "ões"} com estes filtros.</p>
    </div>
  );
}
