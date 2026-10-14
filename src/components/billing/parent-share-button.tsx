"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { readApiJson } from "@/lib/client-response";
import type { PlanTier } from "@/lib/plans";

export function ParentShareButton({ plan }: { plan: PlanTier }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [linkPlan, setLinkPlan] = useState<PlanTier | null>(null);
  const [busy, setBusy] = useState(false);
  const currentLink = linkPlan === plan ? link : "";

  useEffect(() => {
    if (!link) return;
    const controller = new AbortController();
    const timer = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/billing/status", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const status = await response.json() as { hasAccess: boolean; destination: string };
        if (status.hasAccess) { window.clearInterval(timer); router.replace(status.destination); }
      } catch { /* A próxima consulta retoma ao recuperar a conexão. */ }
    }, 8000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [link, router]);

  async function copy() {
    if (busy) return;
    setBusy(true);
    try {
      let url = currentLink;
      if (!url) {
        const response = await fetch("/api/billing/parent-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
        const data = await readApiJson<{ url?: string; error?: string }>(response, "Não foi possível criar o link.");
        if (!response.ok || !data.url) throw new Error(data.error ?? "Não foi possível criar o link.");
        url = data.url; setLink(url); setLinkPlan(plan);
      }
      try { await navigator.clipboard.writeText(url); toast.success("Link copiado para a área de transferência. Envie aos seus pais."); }
      catch { toast.message("Link criado. Selecione e copie o endereço abaixo."); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar o link."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-brand/25 bg-brand-tint p-5" aria-labelledby="pedir-aos-pais">
    <div className="flex items-start gap-3">
      <HeartHandshake className="mt-1 size-6 flex-none text-brand-strong" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="pedir-aos-pais" className="m-0 text-lg font-bold text-ink">Precisa pedir aos seus pais?</h2>
        <p className="mt-1 text-sm text-ink-muted">Envie um link com o plano escolhido. Seu responsável paga com segurança, e o acesso é liberado na sua conta.</p>
        <button type="button" onClick={() => void copy()} disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60">
          <Copy size={17} aria-hidden="true" />{busy ? "Criando link…" : currentLink ? "Copiar link novamente" : "Pedir aos pais"}
        </button>
        {currentLink ? <div className="mt-3"><label htmlFor="parent-share-link" className="text-xs font-medium text-ink-muted">Link para enviar ao responsável</label><input id="parent-share-link" readOnly value={currentLink} onFocus={(event) => event.currentTarget.select()} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink" /><p className="mt-2 text-xs text-ink-muted">Assim que o pagamento for confirmado, esta página libera seu acesso automaticamente.</p></div> : null}
      </div>
    </div>
  </section>;
}
