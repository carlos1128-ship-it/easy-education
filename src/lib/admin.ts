import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

/**
 * Telas internas (custos de IA, reports e revisão de questões). Quem acessa: e-mails de ADMIN_EMAILS
 * (separados por vírgula); sem essa variável, vale a lista BILLING_EXEMPT_EMAILS (a equipe).
 */
export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || process.env.BILLING_EXEMPT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/** Para páginas: quem não é da equipe vê "página não encontrada" (nem sabe que a tela existe). */
export async function requireAdminPage() {
  const user = await getCurrentUserOrRedirect();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}

/** Para rotas da API. */
export async function requireAdminApi() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };
  if (!isAdminEmail(user.email)) return { user: null, response: NextResponse.json({ error: "Não encontrado." }, { status: 404 }) };
  return { user, response: null };
}
