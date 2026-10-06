"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";

const primary =
  "h-11 rounded-xl bg-brand px-5 text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60 dark:bg-[#2563eb] dark:text-white dark:hover:bg-[#1d4ed8]";
const secondary =
  "h-11 rounded-xl border border-border bg-surface px-5 text-[15px] font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60";

/** Abre o portal do Stripe (cartão, troca de plano, cancelamento, faturas). */
export function ManageSubscriptionButton({ label = "Gerenciar assinatura", variant = "primary" }: { label?: string; variant?: "primary" | "secondary" }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const data = await readApiJson<{ url?: string; error?: string }>(response, "Não foi possível abrir o portal.");
      if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível abrir o portal.");
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o portal.");
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={variant === "primary" ? primary : secondary}>
      {loading ? "Abrindo..." : label}
    </button>
  );
}

/** Garantia de 7 dias: confirma duas vezes antes de reembolsar e encerrar. */
export function GuaranteeRefundButton({ deadline }: { deadline: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRefund() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/refund", { method: "POST" });
      const data = await readApiJson<{ ok?: boolean; error?: string }>(response, "Não foi possível concluir o reembolso.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir o reembolso.");
      toast.success("Reembolso solicitado. O valor volta para o mesmo meio de pagamento em alguns dias.");
      router.push("/assinar");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir o reembolso.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={secondary}>
        Cancelar e pedir reembolso
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted p-4">
      <p className="m-0 text-sm text-ink">
        Você recebe de volta todo o valor pago e o acesso termina agora. A garantia vale até {deadline}. Confirmar?
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleRefund} disabled={loading} className="h-11 rounded-xl bg-danger px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
          {loading ? "Processando..." : "Sim, cancelar e reembolsar"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={loading} className={secondary}>
          Manter assinatura
        </button>
      </div>
    </div>
  );
}
