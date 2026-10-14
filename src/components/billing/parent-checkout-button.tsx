"use client";
import { useState } from "react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

export function ParentCheckoutButton({ token, disabled = false }: { token: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function checkout() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/billing/parent-checkout/${token}`, { method: "POST" });
      const data = await readApiJson<{ url?: string; error?: string }>(response, "Não foi possível abrir o pagamento.");
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível abrir o pagamento.");
      window.location.assign(data.url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir o pagamento."); setBusy(false); }
  }
  return <button type="button" onClick={() => void checkout()} disabled={busy || disabled} className="min-h-12 w-full rounded-xl bg-brand px-6 py-3 font-bold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60">{disabled ? "Acesso já liberado" : busy ? "Abrindo Stripe…" : "Quero o Premium para meu filho"}</button>;
}
