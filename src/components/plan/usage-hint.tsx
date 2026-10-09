"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { usePlanOptional } from "@/components/plan/plan-provider";
import { FEATURES, PLANS, type FeatureKey } from "@/lib/plans";
import { describeReset } from "@/lib/time-window";
import { cn } from "@/lib/utils";

/**
 * Aviso de uso: o nome do recurso e uma barra que enche conforme o aluno usa, sem números de limite.
 * Fica âmbar quando falta pouco e vira um convite de upgrade (sem culpa) quando acaba.
 * Não mostra nada se o recurso não tem limite.
 */
export function UsageHint({ feature, className }: { feature: FeatureKey; className?: string }) {
  const plan = usePlanOptional();
  const item = plan?.usage[feature];
  if (!plan || !item || item.state !== "limit" || item.max === null || item.remaining === null || !item.window) return null;

  const meta = FEATURES[feature];
  const period = item.window === "day" ? "hoje" : "esta semana";
  const empty = item.remaining === 0;
  const low = !empty && item.remaining <= Math.max(1, Math.floor(item.max * 0.2));
  const used = Math.min(100, Math.round(((item.max - item.remaining) / Math.max(1, item.max)) * 100));
  const upgrade = item.upgradeTo;
  const label = empty ? `Acabou ${period}. Volta ${describeReset(item.window)}` : low ? `Está acabando ${period}` : `Uso ${period}`;

  return (
    <div
      role="status"
      className={cn(
        "m-0 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full px-3 py-1.5 text-[13px] font-medium",
        empty || low ? "bg-warning-tint text-warning" : "bg-surface-muted text-ink-muted",
        className,
      )}
    >
      <span>{meta.label}</span>
      <span
        className="h-1.5 w-20 overflow-hidden rounded-full bg-track"
        role="progressbar"
        aria-label={`${meta.label}: ${label.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
      >
        <span className={cn("block h-full rounded-full", empty || low ? "bg-warning" : "bg-brand")} style={{ width: `${Math.max(used, 4)}%` }} />
      </span>
      <span>{label}</span>
      {(empty || low) && upgrade ? (
        <Link href={`/assinar?plano=${upgrade === "full" ? "completo" : "basico"}`} className="font-semibold underline underline-offset-2">
          Ver plano {PLANS[upgrade].name}
        </Link>
      ) : null}
    </div>
  );
}

/** Banner de recurso que o plano atual não tem. O botão abre o modal que explica o que o upgrade libera. */
export function LockedNotice({
  feature,
  title,
  description,
  className,
  children,
}: {
  feature: FeatureKey;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const plan = usePlanOptional();
  const meta = FEATURES[feature];
  const upgrade = plan?.usage[feature]?.upgradeTo ?? null;

  return (
    <div className={cn("flex flex-col gap-4 rounded-2xl border border-border bg-surface-muted p-5 sm:flex-row sm:items-center", className)}>
      <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-tint text-brand-strong">
        <Lock size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[15px] font-semibold text-ink">{title ?? `${meta.label} faz parte do plano ${upgrade ? PLANS[upgrade].name : "pago"}`}</p>
        <p className="m-0 mt-1 text-sm text-ink-muted">{description ?? `Libere ${meta.unlocks}.`}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        <button
          type="button"
          onClick={() => plan?.openLocked(feature)}
          className="h-10 rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          Ver o que libera
        </button>
      </div>
    </div>
  );
}
