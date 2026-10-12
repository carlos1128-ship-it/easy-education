/**
 * Fallback Stripe. Novas assinaturas cobram no inicio, sem trial.
 *
 * - Cartão: pelo Stripe Checkout.
 * - Pix Automático: indisponivel neste fallback. A Cakto coleta os metodos no checkout hospedado.
 *   O Stripe Brasil não oferece Pix recorrente, então ele depende de outro
 *   gateway. A estrutura já está pronta para recebê-lo: `subscriptions.provider` guarda de onde vem cada
 *   assinatura, a rota de checkout recebe `method`, e a tela já mostra a opção como "em breve".
 *   Para ligar: implementar o checkout do novo gateway com pagamento imediato,
 *   um webhook que grave em `subscriptions` com provider = "<gateway>" e o status no mesmo vocabulário do
 *   Stripe (trialing, active, past_due, canceled), e trocar `available` para true abaixo.
 */

export type PaymentMethodId = "card" | "pix_automatico";
export type PaymentProvider = "stripe" | "pix_gateway";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  hint: string;
  provider: PaymentProvider;
  available: boolean;
};

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "card", label: "Cartão de crédito", hint: "Pagamento imediato, com sete dias de garantia", provider: "stripe", available: true },
  { id: "pix_automatico", label: "Pix Automático", hint: "Em breve", provider: "pix_gateway", available: false },
];

export function paymentMethod(id: string | null | undefined) {
  return PAYMENT_METHODS.find((method) => method.id === id) ?? null;
}

/** Forma de pagamento que pode ser usada agora (a pedida, se disponível; senão null). */
export function availablePaymentMethod(id: string | null | undefined) {
  const method = paymentMethod(id ?? "card");
  return method?.available ? method : null;
}
