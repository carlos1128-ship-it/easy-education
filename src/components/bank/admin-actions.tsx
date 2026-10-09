"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

type Action = { label: string; body: Record<string, unknown>; tone?: "primary" | "danger" };

/** Botões pequenos da tela interna. Cada um faz uma ação em /api/internal/bank e recarrega a tela. */
export function AdminActions({ actions }: { actions: Action[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: Action) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/internal/bank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action.body) });
      const data = await readApiJson(response, "Não foi possível salvar.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      toast.success("Salvo.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          disabled={busy}
          onClick={() => run(action)}
          className={`h-8 rounded-md border px-2.5 text-xs font-medium disabled:opacity-60 ${action.tone === "primary" ? "border-brand bg-brand text-on-brand" : action.tone === "danger" ? "border-danger text-danger" : "border-border-strong text-ink hover:bg-surface-muted"}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
