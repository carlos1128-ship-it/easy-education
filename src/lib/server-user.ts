import { cache } from "react";
import { redirect } from "next/navigation";
import { getAccessState, type PaidAccess } from "@/lib/billing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Uma chamada ao Supabase Auth por request, mesmo com layout e página pedindo o usuário. */
const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getCurrentUserOrRedirect() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/** O plano do aluno também é pedido uma vez por request (layout e páginas compartilham). */
const getCachedAccess = cache(async (userId: string, email: string | undefined) => getAccessState({ id: userId, email }));

/**
 * Aluno logado e com assinatura (ou teste grátis) em vigor. Não existe plano gratuito: sem assinatura, vai para
 * /assinar escolher o plano. Os limites de src/lib/plans.ts valem nas rotas do servidor.
 */
export async function getStudentOrRedirect(): Promise<{ user: Awaited<ReturnType<typeof getCurrentUserOrRedirect>>; access: PaidAccess }> {
  const user = await getCurrentUserOrRedirect();
  const access = await getCachedAccess(user.id, user.email);
  if (!access.hasAccess) redirect("/assinar");
  return { user, access };
}
