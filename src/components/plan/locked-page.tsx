import Link from "next/link";
import { Lock } from "lucide-react";
import { FEATURES, PLANS, planPriceLabel, upgradeTargetFor, type FeatureKey, type PlanTier } from "@/lib/plans";

/** Tela inteira de um recurso que o plano atual não tem (a checagem fica no servidor, na própria página). */
export function LockedPage({
  feature,
  tier,
  title,
  description,
  bullets,
  children,
}: {
  feature: FeatureKey;
  tier: PlanTier;
  title: string;
  description: string;
  bullets?: string[];
  children?: React.ReactNode;
}) {
  const target = upgradeTargetFor(tier, feature);
  const meta = FEATURES[feature];

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-5 rounded-3xl border border-border bg-surface px-6 py-12 text-center shadow-card">
      <span className="grid size-16 place-items-center rounded-full bg-brand-tint text-brand-strong">
        <Lock size={28} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        <p className="m-0 text-[15px] leading-6 text-ink-muted">{description}</p>
      </div>
      {bullets?.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-left text-sm text-ink">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 flex-none rounded-full bg-brand" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        {target ? (
          <Link
            href={`/assinar?plano=${target === "full" ? "completo" : "basico"}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong"
          >
            Liberar com o plano {PLANS[target].name} · {planPriceLabel(target)}/mês
          </Link>
        ) : null}
        {children}
      </div>
      <p className="m-0 text-[13px] text-ink-muted">
        {meta.label} não faz parte do plano {PLANS[tier].name}. Você pode cancelar quando quiser.
      </p>
    </div>
  );
}
