import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlanPicker } from "@/components/billing/plan-picker";
import { PlanComparisonTable } from "@/components/plan/plan-comparison-table";
import { SignOutLink } from "@/components/billing/sign-out-link";
import { getAccessState, getSubscriptionForUser } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profile";
import { planFromParam } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_NOTICE: Record<string, string> = {
  canceled: "Sua assinatura foi encerrada. Escolha um plano para voltar a estudar.",
  unpaid: "Não conseguimos cobrar sua assinatura. Assine de novo para continuar.",
  incomplete: "O último pagamento não foi concluído. Tente de novo.",
  incomplete_expired: "O último pagamento não foi concluído. Tente de novo.",
  paused: "Sua assinatura está pausada. Escolha um plano para continuar.",
};

export default async function AssinarPage({ searchParams }: { searchParams: Promise<{ plano?: string; cancelado?: string }> }) {
  const params = await searchParams;
  const plan = planFromParam(params.plano);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(plan ? `/cadastro?plano=${plan === "full" ? "completo" : "basico"}` : "/cadastro");

  await ensureProfileForUser(user);
  const access = await getAccessState(user);
  if (access.isPaid) {
    const profile = await getPrisma().profile.findUnique({ where: { userId: user.id } });
    redirect(profile?.onboardingDone ? "/dashboard" : "/onboarding");
  }

  const profileDone = Boolean((await getPrisma().profile.findUnique({ where: { userId: user.id }, select: { onboardingDone: true } }))?.onboardingDone);
  const subscription = await getSubscriptionForUser(user.id);
  const notice = params.cancelado
    ? "Pagamento não concluído. Você pode tentar de novo quando quiser."
    : STATUS_NOTICE[subscription?.status ?? ""];

  return (
    <main className="min-h-screen bg-bg px-4 py-10">
      <section className="mx-auto w-full max-w-[860px] rounded-3xl border border-border bg-surface px-5 py-9 shadow-pop sm:px-8">
        <div className="flex flex-col items-center text-center">
          <Image src="/brand/icone-azul.svg" alt="" width={56} height={56} unoptimized preload className="size-14 dark:hidden" />
          <Image src="/brand/icone-escuro.svg" alt="" width={56} height={56} unoptimized preload className="hidden size-14 dark:block" />
          <p className="m-0 mt-4 text-[13px] font-semibold text-brand-strong">Easy Education</p>
          <h1 className="m-0 mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Escolha seu plano</h1>
          <p className="m-0 mt-2 max-w-[520px] text-[15px] text-ink-muted [text-wrap:balance]">
            O plano Gratuito continua com você: banco de questões, simulados e desempenho. Os planos pagos liberam mais uso de IA.
          </p>
        </div>
        {notice ? (
          <p role="status" className="m-0 mt-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-center text-sm text-ink">
            {notice}
          </p>
        ) : null}
        <div className="mt-8">
          <PlanPicker initialPlan={plan ?? "full"} />
        </div>
        <div className="mt-10">
          <h2 className="m-0 mb-3 text-lg font-bold text-ink">Compare os planos, número por número</h2>
          <PlanComparisonTable current="free" />
        </div>
        <p className="m-0 mt-6 text-center text-sm text-ink-muted">
          <Link className="font-semibold text-brand-strong underline underline-offset-2" href={profileDone ? "/dashboard" : "/onboarding"}>
            Continuar no plano Gratuito
          </Link>
          {" · "}
          Entrou com a conta errada? <SignOutLink />
          {" · "}
          <Link className="font-semibold text-brand-strong underline underline-offset-2" href="/">
            Voltar ao site
          </Link>
        </p>
      </section>
    </main>
  );
}
