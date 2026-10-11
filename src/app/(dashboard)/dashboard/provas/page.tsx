import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import type { PastExamSlug } from "@/lib/bank/constants";
import { examHref } from "@/lib/bank/paths";
import { getPastExamsOverview } from "@/lib/bank/past-exams";
import { parsePersonalization } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Provas anteriores · Easy Education" };
export const dynamic = "force-dynamic";

/** Cor de cada exame (faixa do cartão). */
const EXAM_STYLE: Record<PastExamSlug, { stripe: string; chip: string }> = {
  enem: { stripe: "from-[#2563eb] to-[#06b6d4]", chip: "bg-brand-tint text-brand-strong" },
  fuvest: { stripe: "from-[#1d4ed8] to-[#f59e0b]", chip: "bg-warning-tint text-warning" },
  unicamp: { stripe: "from-[#dc2626] to-[#f97316]", chip: "bg-danger-tint text-danger" },
  etec: { stripe: "from-[#16a34a] to-[#22d3ee]", chip: "bg-success-tint text-success" },
};

/** Qual exame mostrar primeiro, pelo objetivo da personalização. */
function recommendedExam(personalization: unknown): PastExamSlug | null {
  const p = parsePersonalization(personalization);
  if (!p) return null;
  if (p.purpose === "etec") return "etec";
  if (p.purpose !== "enem_vestibular") return null;
  if (p.exam === "Fuvest") return "fuvest";
  if (p.exam === "Unicamp") return "unicamp";
  return "enem";
}

export default async function ProvasPage() {
  const { user, access } = await getStudentOrRedirect();
  const [exams, profile] = await Promise.all([
    getPastExamsOverview(user.id),
    getPrisma().profile.findUnique({ where: { userId: user.id }, select: { personalization: true } }),
  ]);
  const recommended = recommendedExam(profile?.personalization);
  const ordered = [...exams].sort((a, b) => Number(b.slug === recommended) - Number(a.slug === recommended));
  const total = exams.reduce((sum, exam) => sum + exam.total, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
      {/* Topo: a detetive e a coruja do Brasil apresentam o acervo */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-hero-panel p-5 shadow-card lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="m-0 text-sm font-semibold text-brand-strong">Provas anteriores</p>
            <h1 className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink [text-wrap:balance] lg:text-4xl">
              Treine com as questões que já caíram de verdade
            </h1>
            <p className="m-0 max-w-[560px] text-base leading-[1.55] text-ink-muted">
              {total.toLocaleString("pt-BR")} questões oficiais do ENEM, da FUVEST, da UNICAMP e do Vestibulinho ETEC, com o gabarito oficial. Escolha a prova, a matéria e faça treinos de 10 questões, ou a prova inteira no tempo oficial.
            </p>
            <p className="m-0 inline-flex items-center gap-2 text-sm font-medium text-ink">
              <Sparkles size={16} className="text-brand-strong" aria-hidden="true" />
              Fique de olho nas <span className="font-bold text-brand-strong">ultrassecretas</span>: as dos assuntos que mais caem em cada prova.
            </p>
          </div>
          <div className="flex flex-none items-end justify-center gap-2" aria-hidden="true">
            <OwlMascot mood="brasil" size={150} priority />
            <OwlMascot mood="detetive" size={190} priority />
          </div>
        </div>
      </section>

      {ordered.length ? (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Provas">
          {ordered.map((exam) => {
            const accuracy = exam.answered ? Math.round((exam.correct / exam.answered) * 100) : null;
            const style = EXAM_STYLE[exam.slug];
            const years = exam.years.length ? `${exam.years.at(-1)} a ${exam.years[0]}` : "";
            return (
              <Link
                key={exam.slug}
                href={examHref(exam.slug)}
                className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-2 border-b-4 border-border bg-surface p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/50 lg:p-6"
              >
                <span className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", style.stripe)} aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="m-0 text-2xl font-extrabold tracking-[-0.01em] text-ink">{exam.name}</h2>
                      {exam.slug === recommended ? <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-on-brand">Sua prova</span> : null}
                    </div>
                    <p className="m-0 mt-1 text-sm text-ink-muted">{exam.tagline}</p>
                  </div>
                  <span className={cn("flex-none rounded-full px-3 py-1 text-xs font-bold", style.chip)}>{exam.total.toLocaleString("pt-BR")} questões</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {years ? <span className="text-ink-muted">Provas de <span className="font-semibold text-ink">{years}</span></span> : null}
                  <span className="text-ink-muted">
                    {accuracy === null ? "Você ainda não treinou" : (
                      <>Você acertou <span className="font-semibold text-ink">{accuracy}%</span> de {exam.answered}</>
                    )}
                  </span>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-bold text-brand-strong">
                  Escolher matéria <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="m-0 rounded-2xl border border-dashed border-border-strong p-6 text-ink-muted">As provas anteriores estão sendo preparadas. Volte em breve.</p>
      )}

      {access.tier !== "full" ? (
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-brand/40 bg-brand-tint p-5 sm:flex-row sm:items-center lg:p-6">
          <OwlMascot mood="heroi" size={120} className="flex-none self-center" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 flex items-center gap-2 text-lg font-extrabold text-ink">
              <Lock size={18} className="text-brand-strong" aria-hidden="true" /> Questões ultrassecretas
            </h2>
            <p className="m-0 mt-1 text-sm text-ink">
              Em cada treino aparece pelo menos uma questão dos assuntos que mais caem na prova. No seu plano ela vem trancada (você pode pular); no Completo, ela abre com gabarito e resolução.
            </p>
          </div>
          <Link href="/assinar?plano=completo" className="inline-flex min-h-11 flex-none items-center justify-center rounded-xl border-b-4 border-brand-strong bg-brand px-5 text-[15px] font-bold text-on-brand no-underline">
            Ver o Completo
          </Link>
        </section>
      ) : null}

      <p className="m-0 pb-8 text-xs text-ink-muted">
        Fontes: ENEM (INEP), FUVEST, Comvest/UNICAMP e Centro Paula Souza. Cada questão mostra a prova, o ano e o número. O texto das questões é o da prova oficial.
      </p>
    </div>
  );
}
