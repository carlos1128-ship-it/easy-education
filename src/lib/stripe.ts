import Stripe from "stripe";

/** Planos à venda. O preço fica no Stripe (lookup key); aqui só o que o app precisa saber. */
export const PLANS = {
  basic: { id: "basic", name: "Básico", lookupKey: "easy_basic_monthly", price: "R$ 26,90" },
  full: { id: "full", name: "Completo", lookupKey: "easy_full_monthly", price: "R$ 46,90" },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: unknown): value is PlanId {
  return value === "basic" || value === "full";
}

/** Aceita os nomes usados nas URLs em português (?plano=basico|completo). */
export function planFromParam(value: string | null | undefined): PlanId | null {
  const normalized = value?.toLowerCase().trim();
  if (normalized === "basico" || normalized === "basic") return "basic";
  if (normalized === "completo" || normalized === "full") return "full";
  return null;
}

let stripeClient: Stripe | null = null;

function secretKey() {
  return process.env.STRIPE_SECRET_KEY ?? "";
}

export function isStripeConfigured() {
  const key = secretKey();
  return key.startsWith("sk_") || key.startsWith("rk_");
}

export function getStripe() {
  if (!isStripeConfigured()) throw new Error("STRIPE_SECRET_KEY nao configurada.");
  stripeClient ??= new Stripe(secretKey(), {
    appInfo: { name: "Easy Education" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  return stripeClient;
}

const priceCache = new Map<PlanId, { id: string; expiresAt: number }>();

/** Busca o preço pelo lookup key (troca de preço no Stripe não exige deploy). Cache de 10 min. */
export async function getPriceIdForPlan(plan: PlanId) {
  const cached = priceCache.get(plan);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const prices = await getStripe().prices.list({ lookup_keys: [PLANS[plan].lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) throw new Error(`Preco do plano ${plan} nao encontrado no Stripe.`);
  priceCache.set(plan, { id: price.id, expiresAt: Date.now() + 10 * 60_000 });
  return price.id;
}

/** Descobre o plano a partir do preço da assinatura (lookup key ou metadata). */
export function planFromPrice(price: Stripe.Price | null | undefined): PlanId | null {
  if (!price) return null;
  const byLookup = (Object.keys(PLANS) as PlanId[]).find((plan) => PLANS[plan].lookupKey === price.lookup_key);
  if (byLookup) return byLookup;
  return isPlanId(price.metadata?.plan) ? price.metadata.plan : null;
}
