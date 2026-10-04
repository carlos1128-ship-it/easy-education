"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { useActiveStudy } from "@/lib/active-study";

const MAX_MINUTES = 600;

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Cronômetro compacto no canto superior direito enquanto há um estudo do plano em andamento. */
export function StudyTimer() {
  const router = useRouter();
  const pathname = usePathname();
  const { active, setActive } = useActiveStudy();
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const elapsed = now - active.startedAt;

  async function complete() {
    if (!active) return;
    const minutes = Math.min(MAX_MINUTES, Math.max(1, Math.round((Date.now() - active.startedAt) / 60000)));
    setSaving(true);
    const response = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: active.subject, durationMinutes: minutes, method: active.method || "Plano", notes: active.topic || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Não foi possível registrar o estudo.");
      return;
    }
    setActive(null);
    toast.success(`Estudo registrado: ${minutes} min de ${active.subject}.`);
    router.refresh();
  }

  function cancel() {
    if (window.confirm("Descartar este estudo? O tempo não será registrado.")) setActive(null);
  }

  return (
    <div
      role="status"
      aria-label={`Estudando ${active.subject}`}
      className="fixed right-3 top-[60px] z-40 flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-3 pr-1.5 shadow-pop lg:right-6 lg:top-[76px]"
    >
      <span className="relative flex size-2.5 flex-shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
      </span>
      {active.href && pathname !== active.href ? (
        <Link href={active.href} className="max-w-[120px] truncate text-[13px] font-medium text-ink no-underline hover:underline lg:max-w-[180px]" title={`Voltar para ${active.subject}`}>
          {active.subject}
        </Link>
      ) : (
        <span className="max-w-[120px] truncate text-[13px] font-medium text-ink lg:max-w-[180px]" title={active.topic}>
          {active.subject}
        </span>
      )}
      <span className="font-mono text-[13px] font-medium tabular-nums text-brand-strong">{formatClock(elapsed)}</span>
      <button
        type="button"
        onClick={complete}
        disabled={saving}
        className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 text-xs font-medium text-on-brand hover:bg-brand-strong disabled:opacity-70"
      >
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {saving ? "Salvando" : "Concluir"}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        aria-label="Descartar estudo em andamento"
        className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
