import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { apiErrorResponse } from "@/lib/api-error";
import { markFirstPayment, syncSubscription } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Assinatura ligada a uma fatura (nas versões novas da API ela fica em `parent`). */
function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  return idOf(invoice.parent?.subscription_details?.subscription);
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const subscriptionId = idOf(session.subscription);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      // Relê do Stripe: o objeto do evento pode estar desatualizado se os eventos chegarem fora de ordem.
      await syncSubscription(event.data.object.id);
      return;
    case "invoice.paid": {
      const invoice = event.data.object;
      const customerId = idOf(invoice.customer);
      if (customerId && invoice.amount_paid > 0) {
        await markFirstPayment(customerId, new Date((invoice.status_transitions.paid_at ?? invoice.created) * 1000));
      }
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return;
    }
    case "invoice.payment_failed": {
      const subscriptionId = invoiceSubscriptionId(event.data.object);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return;
    }
    default:
      return;
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const prisma = getPrisma();
  // O Stripe pode reenviar o mesmo evento: processa cada um uma vez só.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    console.error("[stripe.webhook] banco indisponivel", error);
    return NextResponse.json({ error: "Tente novamente." }, { status: 503 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Libera o evento para o Stripe tentar de novo (a resposta de erro faz o Stripe reenviar).
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    return apiErrorResponse(error, { scope: `stripe.webhook.${event.type}`, fallback: "Falha ao processar o evento." });
  }
}
