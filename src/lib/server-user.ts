import { cache } from "react";
import { redirect } from "next/navigation";
import { getAccessState } from "@/lib/billing";
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

/** Usuário logado e com assinatura ativa; sem assinatura, vai para a escolha do plano. */
export async function getPaidUserOrRedirect() {
  const user = await getCurrentUserOrRedirect();
  const access = await getAccessState(user);
  if (!access.hasAccess) redirect("/assinar");
  return { user, access };
}
