import { randomUUID } from "node:crypto";
import type { PlanId } from "@/lib/stripe";

const API_BASE = "https://api.cakto.com.br/public_api";

type TokenResponse = { access_token: string; expires_in: number };
let tokenCache: { value: string; expiresAt: number } | null = null;

export function isCaktoConfigured() {
  return Boolean(
    process.env.CAKTO_OFFER_BASIC_ID?.trim() &&
      process.env.CAKTO_OFFER_FULL_ID?.trim() &&
      process.env.CAKTO_WEBHOOK_SECRET?.trim() &&
      process.env.CAKTO_CLIENT_ID?.trim() &&
      process.env.CAKTO_CLIENT_SECRET?.trim(),
  );
}

export function caktoOfferId(plan: PlanId) {
  const suffix = plan === "basic" ? "BASIC" : "FULL";
  const value = process.env[`CAKTO_OFFER_${suffix}_ID`]?.trim();
  if (!value) throw new Error(`Oferta Cakto do plano ${plan} não configurada.`);
  return value;
}

export function createCaktoCallbackToken() {
  return randomUUID();
}

export function caktoCheckoutUrl(offerId: string, callback: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(offerId) || !/^[A-Za-z0-9._~-]{1,255}$/.test(callback)) {
    throw new Error("Identificador de oferta ou callback Cakto inválido.");
  }
  const url = new URL(`https://pay.cakto.com.br/${offerId}`);
  url.searchParams.set("callback", callback);
  return url.toString();
}

export async function getCaktoAccessToken() {
  const clientId = process.env.CAKTO_CLIENT_ID?.trim();
  const clientSecret = process.env.CAKTO_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Credenciais da API Cakto não configuradas.");
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;

  const response = await fetch(`${API_BASE}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  const payload = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!response.ok || !payload?.access_token || !payload.expires_in) {
    throw new Error("Não foi possível autenticar na API Cakto.");
  }
  tokenCache = { value: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
  return tokenCache.value;
}

export async function caktoApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Caminho de API Cakto inválido.");
  const token = await getCaktoAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`A API Cakto respondeu com status ${response.status}.`);
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export type CaktoOffer = {
  id: string;
  price: number;
  currency: string;
  status: string;
  type: string;
  intervalType: string;
  interval: number;
  recurrence_period: number;
  quantity_recurrences: number;
  trial_days: number;
};

export async function getCaktoOffer(id: string) {
  return caktoApiRequest<CaktoOffer>(`/offers/${encodeURIComponent(id)}/`);
}

export type CaktoSubscription = {
  id: string;
  status: string;
  next_payment_date: string | null;
};

export async function getCaktoSubscription(id: string) {
  return caktoApiRequest<CaktoSubscription>(`/subscriptions/${encodeURIComponent(id)}/`);
}
