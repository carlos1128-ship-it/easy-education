import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { confirmCheckoutSession, getAccessState } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Volta do Stripe Checkout: confirma o pagamento na hora (sem esperar o webhook) e segue para o app. */
export default async function AssinaturaSucessoPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/assinar");

  if (sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    try {
      await confirmCheckoutSession(sessionId, user.id);
    } catch (error) {
      console.error("[assinar.sucesso]", error);
    }
  }

  const access = await getAccessState(user);
  if (access.isPaid) {
    const profile = await getPrisma().profile.findUnique({ where: { userId: user.id } });
    redirect(profile?.onboardingDone ? "/dashboard" : "/onboarding");
  }

  return (
    <AuthShell title="Pagamento em análise" subtitle="Assim que o pagamento for confirmado, seu acesso é liberado automaticamente.">
      <div className="flex flex-col gap-4 text-center">
        <p className="m-0 text-sm text-ink-muted">
          Pagamentos por boleto ou Pix podem levar alguns minutos. Você também recebe o recibo por e-mail.
        </p>
        <Link
          href={sessionId ? `/assinar/sucesso?session_id=${encodeURIComponent(sessionId)}` : "/assinar"}
          className="grid h-12 place-items-center rounded-xl bg-brand text-[15px] font-semibold text-on-brand no-underline transition-colors hover:bg-brand-strong"
        >
          Verificar de novo
        </Link>
        <Link href="/assinar" className="text-sm font-semibold text-brand-strong underline underline-offset-2">
          Escolher outro plano
        </Link>
      </div>
    </AuthShell>
  );
}
