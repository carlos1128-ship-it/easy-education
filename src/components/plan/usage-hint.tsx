"use client";

import { Lock } from "lucide-react";
import { usePlanOptional } from "@/components/plan/plan-provider";
import { FEATURES, PLANS, type FeatureKey } from "@/lib/plans";
import { cn } from "@/lib/utils";

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
