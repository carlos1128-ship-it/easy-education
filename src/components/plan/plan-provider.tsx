"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { lockedInfo, type PlanLimitInfo } from "@/lib/plan-limits";
import { PLAN_LIMIT_EVENT } from "@/lib/plan-limit-events";
import { FEATURES, PLANS, planPriceLabel, type FeatureKey, type PlanTier } from "@/lib/plans";
import type { FeatureUsage, UsageSnapshot } from "@/lib/usage";

type PlanContextValue = {
  tier: PlanTier;
  usage: Record<FeatureKey, FeatureUsage>;
  /** Atualiza o "restam X" na hora, com o número que a API devolveu depois de um uso. */
  setRemaining: (feature: FeatureKey, remaining: number | null, resetAt?: string | null) => void;
  /** Abre o modal com os detalhes de um limite (resposta da API). */
  openLimit: (info: PlanLimitInfo) => void;
  /** Abre o modal de um recurso que o plano atual não tem (cadeado). */
  openLocked: (feature: FeatureKey) => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) throw new Error("usePlan precisa estar dentro do PlanProvider.");
  return context;
}

/** Igual a usePlan, mas devolve null fora do dashboard (componentes que também aparecem em páginas públicas). */
export function usePlanOptional() {
  return useContext(PlanContext);
}


function dialogCopy(info: PlanLimitInfo) {
  const featureLabel = info.feature ? FEATURES[info.feature].label : "Uso do dia";
  switch (info.code) {
    case "feature_locked":
      return { icon: Lock, title: info.upgradeTo ? `${featureLabel} é do plano ${PLANS[info.upgradeTo].name}` : `${featureLabel} não está no seu plano` };
    case "subscription_required":
      return { icon: Lock, title: "Escolha um plano para usar a IA" };
    case "file_too_large":
      return { icon: ShieldAlert, title: "Esse arquivo passou do tamanho do seu plano" };
    case "daily_cap":
      return { icon: Clock, title: "Você estudou bastante por hoje" };
    case "monthly_cap":
      return { icon: Clock, title: "Você usou bastante a IA neste mês" };
    default:
      return { icon: Clock, title: info.window === "week" ? "Seu limite da semana acabou" : "Seu limite de hoje acabou" };
  }
}

function UpgradeDialog({ info, onClose }: { info: PlanLimitInfo | null; onClose: () => void }) {
  const router = useRouter();
  const copy = info ? dialogCopy(info) : null;
  const Icon = copy?.icon ?? Lock;
  const target = info?.upgradeTo ?? null;
  // O cartão do plano logo abaixo já diz o que o upgrade inclui; a frase final da mensagem só repetiria isso.
  const message = info && target ? info.message.replace(/ No plano S+ você (?:tem|libera) .*$/, "") : (info?.message ?? "");

  return (
    <Dialog open={Boolean(info)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        {info && copy ? (
          <>
            <DialogHeader className="items-start gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brand-tint text-brand-strong">
                <Icon size={22} aria-hidden="true" />
              </span>
              <DialogTitle className="text-xl font-bold leading-snug text-ink">{copy.title}</DialogTitle>
              <DialogDescription className="text-[15px] leading-relaxed text-ink-muted">{message}</DialogDescription>
            </DialogHeader>

            {target ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="m-0 text-sm font-semibold text-ink">
                  Plano {PLANS[target].name} · {planPriceLabel(target)}/mês
                </p>
                {info.upgradeOffer ? <p className="m-0 mt-1 text-sm text-ink-muted">Com ele: {info.upgradeOffer}.</p> : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose}>
                {target ? "Agora não" : "Entendi"}
              </Button>
              {target ? (
                <Button
                  onClick={() => {
                    onClose();
                    router.push(`/assinar?plano=${target === "full" ? "completo" : "basico"}`);
                  }}
                >
                  Ver o plano {PLANS[target].name}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Dá ao dashboard o plano do aluno, o uso do dia, o modal de limite e o modal de cadeado. */
export function PlanProvider({ tier, usage: initialUsage, children }: { tier: PlanTier; usage: UsageSnapshot["features"]; children: React.ReactNode }) {
  const [usage, setUsage] = useState(initialUsage);
  const [info, setInfo] = useState<PlanLimitInfo | null>(null);

  // Quando o servidor manda um uso novo (router.refresh), ele vale mais que o número guardado no navegador.
  const [lastInitial, setLastInitial] = useState(initialUsage);
  if (initialUsage !== lastInitial) {
    setLastInitial(initialUsage);
    setUsage(initialUsage);
  }

  const openLimit = useCallback((next: PlanLimitInfo) => setInfo(next), []);
  const openLocked = useCallback((feature: FeatureKey) => setInfo(lockedInfo(tier, feature)), [tier]);
  const setRemaining = useCallback((feature: FeatureKey, remaining: number | null, resetAt?: string | null) => {
    setUsage((current) => {
      const item = current[feature];
      if (!item || item.state !== "limit" || remaining === null || item.max === null) return current;
      return { ...current, [feature]: { ...item, remaining, used: item.max - remaining, resetAt: resetAt ?? item.resetAt } };
    });
  }, []);

  // O layout do dashboard não recarrega a cada página: ao trocar de tela, busca o uso atualizado.
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/usage", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<UsageSnapshot>) : null))
      .then((snapshot) => {
        if (snapshot?.features) setUsage(snapshot.features);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  useEffect(() => {
    function onLimit(event: Event) {
      const detail = (event as CustomEvent<{ info: PlanLimitInfo; handled: boolean }>).detail;
      detail.handled = true;
      setInfo(detail.info);
    }
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
  }, []);

  const value = useMemo(() => ({ tier, usage, setRemaining, openLimit, openLocked }), [tier, usage, setRemaining, openLimit, openLocked]);

  return (
    <PlanContext.Provider value={value}>
      {children}
      <UpgradeDialog info={info} onClose={() => setInfo(null)} />
    </PlanContext.Provider>
  );
}
