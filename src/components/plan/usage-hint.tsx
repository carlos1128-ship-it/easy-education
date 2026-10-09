"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { usePlanOptional } from "@/components/plan/plan-provider";
import { FEATURES, PLANS, type FeatureKey } from "@/lib/plans";
import { describeReset } from "@/lib/time-window";
import { cn } from "@/lib/utils";

/**
 * Aviso de uso: "Restam 2 de 3 mensagens no chat hoje". Fica âmbar quando falta pouco
 * e vira um convite de upgrade (sem culpa) quando acaba. Não mostra nada se o recurso não tem limite.
 */
export function UsageHint({ feature, className }: { feature: FeatureKey; className?: string }) {
  const plan = usePlanOptional();
  const item = plan?.usage[feature];
  if (!plan || !item || item.state !== "limit" || item.max === null || item.remaining === null || !item.window) return null;

  const meta = FEATURES[feature];
  const noun = item.max === 1 ? meta.singular : meta.plural;
  const period = item.window === "day" ? "hoje" : "esta semana";
  const empty = item.remaining === 0;
  const low = !empty && item.remaining <= Math.max(1, Math.floor(item.max * 0.2));
  const upgrade = item.upgradeTo;

  return (
    <p
      role="status"
      className={cn(
        "m-0 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full px-3 py-1.5 text-[13px] font-medium",
        empty ? "bg-warning-tint text-warning" : low ? "bg-warning-tint text-warning" : "bg-surface-muted text-ink-muted",
        className,
      )}
    >
      {empty ? (
        <span>
          Acabou: {item.max} {noun} {period}. Volta {describeReset(item.window)}.
        </span>
      ) : (
        <span>
          {item.remaining === 1 ? "Resta" : "Restam"} {item.remaining} de {item.max} {noun} {period}
        </span>
      )}
      {(empty || low) && upgrade ? (
        <Link href={`/assinar?plano=${upgrade === "full" ? "completo" : "basico"}`} className="font-semibold underline underline-offset-2">
          Ver plano {PLANS[upgrade].name}
        </Link>
      ) : null}
    </p>
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
