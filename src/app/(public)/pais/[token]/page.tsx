import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarCheck, FileText, MessageCircle, ShieldCheck, Target } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import { ParentCheckoutButton } from "@/components/billing/parent-checkout-button";
import { getParentPaymentRequest } from "@/lib/parent-payments";
import { PLANS, formatPriceBRL } from "@/lib/plans";
import { isStripeTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apoie os estudos · Easy Education", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
const features = [
  { icon: Target, title: "Quizzes por assunto", text: "Prática com explicações para entender cada resposta." },
  { icon: BookOpen, title: "Flashcards e revisão", text: "Revisões espaçadas para lembrar o conteúdo por mais tempo." },
  { icon: FileText, title: "Correção de redação", text: "Comentários por competência para orientar a reescrita." },
  { icon: CalendarCheck, title: "Plano de estudos", text: "Uma rotina organizada de acordo com o tempo do estudante." },
  { icon: MessageCircle, title: "Chat com IA", text: "Ajuda para tirar dúvidas e praticar com o próprio material." },
  { icon: ShieldCheck, title: "Simulados e desempenho", text: "Treinos e acompanhamento do que precisa ser revisado." },
];
export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await getParentPaymentRequest(token);
  if (!request) notFound();
  const name = request.profile.name.trim().split(/\s+/)[0];
  const studentName = !name || name.includes("@") ? "Seu filho" : name;
  const plan = PLANS[request.plan as "basic" | "full"];
  return <main className="min-h-screen bg-bg px-4 py-6 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between"><Logo size="lg" preload /><Link href="/" className="text-sm font-medium text-ink-muted">Conhecer o Easy Education</Link></header>
      {isStripeTestMode() ? <p role="status" className="mb-5 rounded-xl border border-warning/30 bg-warning-tint px-4 py-3 text-sm text-ink">Ambiente de teste: nenhum valor real será cobrado. Use apenas dados de teste do Stripe.</p> : null}
      <section className="grid items-center gap-8 rounded-3xl border border-border bg-hero-panel p-6 shadow-card sm:p-10 md:grid-cols-[1fr_260px]">
        <div><p className="text-sm font-semibold text-brand-strong">Um apoio para a rotina de estudos</p><h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">{studentName} quer sua ajuda para estudar melhor</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">Com o Easy Education, o material vira prática, as dúvidas recebem explicações e o estudante acompanha a própria evolução.</p></div>
        <OwlMascot mood="estudando" size={250} priority className="mx-auto" />
      </section>
      <section className="my-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Recursos de estudo">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border bg-surface p-5"><Icon className="size-6 text-brand-strong" aria-hidden="true" /><h2 className="mt-3 font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p></article>)}</section>
      <section className="mx-auto max-w-xl rounded-3xl border border-brand/30 bg-surface p-6 text-center shadow-card sm:p-8">
        <p className="text-sm font-semibold text-brand-strong">Plano {plan.name}</p><p className="mt-3 text-4xl font-extrabold text-ink">{formatPriceBRL(plan.priceCents)}<span className="ml-1 text-base font-normal text-ink-muted">/mês</span></p>
        <p className="my-5 text-sm text-ink-muted">Assinatura mensal. Sete dias de garantia após o primeiro pagamento. O responsável paga, e o acesso é liberado na conta de {studentName}.</p>
        <ParentCheckoutButton token={token} disabled={!!request.completedAt} />
        <p className="mt-4 text-xs text-ink-muted">Pagamento seguro pelo Stripe. Não é necessário criar outra conta.</p>
      </section>
      <footer className="mt-8 flex justify-center gap-5 text-xs text-ink-muted"><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link></footer>
    </div>
  </main>;
}
