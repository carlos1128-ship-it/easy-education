import Link from "next/link";
import { notFound } from "next/navigation";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import { Logo } from "@/components/brand/logo";
import { confirmParentPayment, getParentPaymentRequest } from "@/lib/parent-payments";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmação do pagamento · Easy Education", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function ParentSuccess({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { token } = await params;
  const { session_id: sessionId } = await searchParams;
  const request = await getParentPaymentRequest(token);
  if (!request) notFound();
  let paid = !!request.completedAt;
  if (sessionId && !paid) {
    try { paid = await confirmParentPayment(token, sessionId); }
    catch { console.error("[parent-payment.confirm] Não foi possível confirmar a sessão."); }
  }
  return <main className="grid min-h-screen place-items-center bg-bg p-5"><section className="flex w-full max-w-lg flex-col items-center rounded-3xl border border-border bg-surface p-8 text-center shadow-card"><Logo size="lg" /><OwlMascot mood={paid ? "comemorando" : "notebook"} size={200} priority className="my-5" /><h1 className="text-2xl font-extrabold text-ink">{paid ? "Acesso liberado para o estudante" : "Aguardando confirmação"}</h1><p className="mt-3 text-sm leading-relaxed text-ink-muted">{paid ? "Obrigado por apoiar os estudos. O estudante pode continuar com a conta que já utiliza no Easy Education." : "O acesso será liberado assim que o Stripe confirmar o pagamento."}</p>{!paid && sessionId ? <Link href={`/pais/${token}/sucesso?session_id=${encodeURIComponent(sessionId)}`} className="mt-5 rounded-xl bg-brand px-5 py-3 font-semibold text-on-brand">Verificar novamente</Link> : null}<Link href="/login" className="mt-5 text-sm font-semibold text-brand-strong">Entrar na conta do estudante</Link></section></main>;
}
