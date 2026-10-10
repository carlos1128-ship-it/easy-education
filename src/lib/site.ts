/**
 * Dados institucionais usados no rodapé, nas páginas legais e nos e-mails.
 * O e-mail de contato vem de NEXT_PUBLIC_SUPPORT_EMAIL (o mesmo usado no "Reportar questão").
 * Sem ele, as telas mostram o caminho alternativo (Configurações) em vez de um e-mail inventado.
 */

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";

/** Quem responde pelos dados (controlador, na LGPD). Preencha a razão social e o CNPJ em NEXT_PUBLIC_LEGAL_ENTITY. */
export const LEGAL_ENTITY = process.env.NEXT_PUBLIC_LEGAL_ENTITY?.trim() || "Easy Education";

/** Data da versão atual dos Termos e da Política (mude ao alterar o texto). */
export const LEGAL_VERSION = "10/10/2026";

export const legalLinks = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política de Privacidade" },
] as const;

export function supportMailto(subject?: string) {
  if (!SUPPORT_EMAIL) return "";
  return `mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
