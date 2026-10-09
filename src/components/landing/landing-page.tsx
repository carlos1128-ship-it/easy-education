import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHeader } from "@/components/landing/landing-header";
import {
  IconAlert,
  IconArrowRight,
  IconBook,
  IconCards,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconFile,
  IconPen,
  IconRotate,
  IconShield,
  IconSquareCheck,
} from "@/components/landing/landing-icons";
import {
  illustrativeLabel,
  landingFaq,
  landingFeatureStrip,
  landingFinalCta,
  landingFooter,
  landingHero,
  landingLinks,
  landingNav,
  landingPerformance,
  landingPlans,
  landingProblem,
  landingResources,
  landingSolution,
  landingSteps,
} from "@/content/landing";
import { cn } from "@/lib/utils";
import { EvidenceSection, TestimonialsSection } from "@/components/landing/landing-extras";
import { PlanComparisonTable } from "@/components/plan/plan-comparison-table";
import { planHighlights, pricePerDayLabel } from "@/lib/plan-comparison";
import { uploadLimitMB } from "@/lib/plans";

const container = "mx-auto max-w-[1520px] px-5 lg:px-12 2xl:px-16";
const sectionTop = "pt-16 lg:pt-24";
const eyebrow = "text-[13px] font-medium uppercase leading-4 tracking-[0.6px] text-brand-strong";
const h2 = "m-0 text-[28px] font-bold leading-[34px] tracking-[-0.5px] [text-wrap:balance] lg:text-4xl lg:leading-[42px]";
const lead = "m-0 text-[15px] leading-[26px] text-ink-muted lg:text-[17px]";
// Light 300 só a partir de 18px
const leadLarge = "m-0 text-[15px] leading-[26px] lg:text-lg lg:font-light lg:leading-[28px]";
const tagPill = "rounded-full bg-brand-tint px-3 py-1 text-[13px] font-medium leading-4 text-brand-strong";
const h3 = "m-0 text-[28px] font-bold leading-[34px] [text-wrap:balance]";
const mockPanel = "rounded-3xl bg-surface-muted p-4 lg:p-10";
const mockCard = "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-card lg:p-6";
const smallBadge = "flex-none rounded-full px-2 py-[3px] text-[11px] font-medium leading-[14px] text-ink-muted";

/** Separa o título em [antes, trecho, depois] para estilizar só o trecho. */
function splitTitle(title: string, part: string) {
  const index = title.indexOf(part);
  if (index < 0) return [title, "", ""] as const;
  return [title.slice(0, index), part, title.slice(index + part.length)] as const;
}

function IllustrativeBadge({ className }: { className?: string }) {
  return <span className={cn(smallBadge, "bg-surface-muted", className)}>{illustrativeLabel}</span>;
}

const featureIcons = [IconRotate, IconPen, IconClock] as const;
const heroIcons = [IconBook, IconSquareCheck, IconFile] as const;

export function LandingPage() {
  return (
    <div className="overflow-hidden bg-bg text-[15px] leading-6 text-ink antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <LandingHeader />
      {/* Hero */}
      <section className="px-3 pt-4 lg:px-6">
        <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-3xl bg-hero-panel dark:overflow-visible">
          {/* Espaço da barra do topo, que fica fixa e acompanha a rolagem (ver LandingHeader). */}
          <div className="h-[60px] lg:h-[68px]" aria-hidden="true" />
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative z-[2] flex flex-col items-start gap-5 px-5 pb-2 pt-7 lg:pb-16 lg:pl-14 lg:pr-0 lg:pt-12">
              <h1 className="m-0 max-w-[540px] text-4xl font-black leading-[42px] tracking-[-1.2px] text-ink [text-wrap:balance] lg:text-[56px] lg:leading-[62px]">
                {(() => {
                  const [before, keyword, after] = splitTitle(landingHero.title, landingHero.titleKeyword);
                  return (
                    <>
                      {before}
                      <span className="text-brand">{keyword}</span>
                      {after}
                    </>
                  );
                })()}
              </h1>
              <p className={cn(leadLarge, "max-w-[580px] text-ink-muted")}>{landingHero.subtitle}</p>
              <div className="mt-2 box-border flex w-full max-w-[560px] flex-col items-stretch gap-2.5 rounded-2xl border border-border bg-surface p-1.5 shadow-card lg:flex-row lg:rounded-full">
                <div className="flex flex-1 items-center gap-2.5 py-2 pl-3.5 pr-1.5 text-ink-muted">
                  <IconBook size={20} className="flex-none text-brand-strong" />
                  <span className="text-sm leading-5 text-ink lg:whitespace-nowrap">{landingHero.boxText}</span>
                </div>
                <Link
                  href={landingLinks.signUp}
                  className="grid h-12 w-full flex-none place-items-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline transition-colors hover:bg-brand-strong lg:w-auto"
                >
                  {landingHero.cta}
                </Link>
              </div>
              <div className="mt-1 flex flex-col flex-wrap gap-x-7 gap-y-3.5 lg:mt-5 lg:flex-row">
                {landingHero.highlights.map((label, index) => {
                  const Icon = heroIcons[index];
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <span className="grid size-9 flex-none place-items-center rounded-full border border-border bg-surface text-brand-strong">
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-medium leading-5 text-ink">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative min-h-[440px] lg:min-h-[580px]">
              <div className="absolute left-1/2 top-[30px] size-[350px] -translate-x-1/2 rounded-full bg-hero-ring lg:left-[56%] lg:top-[12%] lg:size-[520px]" />
              <div className="absolute left-1/2 top-[60px] size-[290px] -translate-x-1/2 rounded-full bg-brand-soft lg:left-[56%] lg:top-[calc(12%+50px)] lg:size-[420px]" />
              <Image
                src={landingHero.image.src}
                width={landingHero.image.width}
                height={landingHero.image.height}
                alt={landingHero.image.alt}
                priority
                sizes="(min-width: 1024px) 380px, 300px"
                className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 lg:left-[56%] lg:h-[94%] dark:[mask-image:linear-gradient(to_bottom,#000_82%,transparent)]"
              />
              <span className="absolute left-[6%] top-[38%] z-[3] hidden size-14 items-center justify-center rounded-full border border-border bg-surface text-brand-strong shadow-pop lg:flex">
                <IconSquareCheck size={22} />
              </span>
              <span className="absolute right-[10%] top-[8%] z-[3] hidden size-14 items-center justify-center rounded-full border border-border bg-surface text-brand-strong shadow-pop lg:flex">
                <IconCards size={22} />
              </span>
              <div className="absolute bottom-4 left-3 z-[3] flex items-center gap-2.5 rounded-2xl border border-border bg-surface py-2 pl-2 pr-3.5 shadow-pop lg:-left-8 lg:bottom-[72px]">
                <span className="grid size-[34px] flex-none place-items-center rounded-full bg-warning-tint text-warning">
                  <IconClock size={16} strokeWidth={2} />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold leading-4 text-ink">{landingHero.floatingCard.title}</span>
                  <span className="text-[11px] font-medium leading-[14px] text-ink-muted">{landingHero.floatingCard.note}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa de recursos */}
      <section className={cn(container, "pt-10")}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {landingFeatureStrip.map((label, index) => {
            const Icon = featureIcons[index];
            return (
              <div key={label} className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-5 py-4">
                <span className="grid size-10 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong">
                  <Icon size={20} />
                </span>
                <span className="font-medium">{label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* O problema */}
      <section className={cn(container, sectionTop)}>
        <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-4">
            <span className={eyebrow}>{landingProblem.eyebrow}</span>
            <h2 className={h2}>{landingProblem.title}</h2>
            <p className={cn(lead, "max-w-[460px] [text-wrap:pretty]")}>{landingProblem.text}</p>
            <div className="mt-1 flex flex-col gap-3">
              {landingProblem.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="mt-[9px] h-0.5 w-4 flex-none rounded-sm bg-border-strong" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative pt-10 lg:-order-1">
            <div className="absolute inset-x-0 bottom-0 h-[300px] rounded-[999px_999px_24px_24px] bg-brand-deep lg:h-[440px]" />
            <Image
              src={landingProblem.image.src}
              width={landingProblem.image.width}
              height={landingProblem.image.height}
              alt={landingProblem.image.alt}
              sizes="(min-width: 1024px) 470px, 86vw"
              className="relative mx-auto block h-auto w-[86%]"
            />
          </div>
        </div>
      </section>

      {/* Com o Easy Education */}
      <section className={cn(container, sectionTop)}>
        <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col items-start gap-4">
            <span className={eyebrow}>{landingSolution.eyebrow}</span>
            <h2 className={cn(h2, "font-light")}>
              {(() => {
                const [before, strong, after] = splitTitle(landingSolution.title, landingSolution.titleStrong);
                return (
                  <>
                    {before}
                    <span className="font-black text-brand">{strong}</span>
                    {after}
                  </>
                );
              })()}
            </h2>
            <p className={cn(lead, "max-w-[460px] [text-wrap:pretty]")}>{landingSolution.text}</p>
            <div className="mt-1 flex flex-col gap-3">
              {landingSolution.points.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span className="grid size-[22px] flex-none place-items-center rounded-full bg-success-tint text-success">
                    <IconCheck size={13} strokeWidth={3} />
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative pt-10">
            <div className="absolute inset-x-0 bottom-0 h-[300px] rounded-[999px_999px_24px_24px] bg-brand-soft lg:h-[440px]" />
            <Image
              src={landingSolution.image.src}
              width={landingSolution.image.width}
              height={landingSolution.image.height}
              alt={landingSolution.image.alt}
              sizes="(min-width: 1024px) 490px, 90vw"
              className="relative ml-auto block h-auto w-[90%]"
            />
            <div className="relative z-[2] -mt-7 box-border flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-pop lg:absolute lg:bottom-[14%] lg:left-0 lg:mt-0 lg:w-[46%]">
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap text-sm font-bold leading-5">{landingSolution.chat.title}</span>
                <IllustrativeBadge />
              </div>
              <span className="max-w-[88%] self-end rounded-[12px_12px_4px_12px] bg-brand px-3 py-2 text-[13px] leading-[19px] text-on-brand">
                {landingSolution.chat.question}
              </span>
              <span className="max-w-[94%] self-start rounded-[12px_12px_12px_4px] bg-surface-muted px-3 py-2 text-[13px] leading-[19px]">
                {landingSolution.chat.answer}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className={cn(container, sectionTop, "flex scroll-mt-24 flex-col gap-7 lg:gap-16")}>
        <div className="flex max-w-[640px] flex-col gap-3">
          <span className={eyebrow}>{landingResources.eyebrow}</span>
          <h2 className={h2}>{landingResources.title}</h2>
          <p className={lead}>{landingResources.text}</p>
        </div>

        <QuizFeature />
        <FlashcardFeature />
        <EssayFeature />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SimuladoCard />
          <ChatCard />
          <PlanCard />
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className={cn(container, sectionTop, "flex scroll-mt-24 flex-col gap-10")}>
        <div className="flex max-w-[640px] flex-col gap-3">
          <span className={eyebrow}>{landingSteps.eyebrow}</span>
          <h2 className={h2}>{landingSteps.title}</h2>
        </div>
        <ol className="m-0 grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-3">
          {landingSteps.steps.map((step) => (
            <li key={step.n} className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-surface px-4 pb-4 pt-7 lg:px-6 lg:pb-6">
              <span className="absolute -right-6 -top-6 size-24 rounded-full bg-brand-tint" aria-hidden="true" />
              <span className="relative grid size-11 place-items-center rounded-full bg-brand-deep text-lg font-bold leading-none text-white">
                {step.n}
              </span>
              <h3 className="m-0 mt-2 text-lg font-bold leading-[26px]">{step.title}</h3>
              <p className="m-0 text-ink-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {landingPlans.enabled ? <PlansSection /> : null}

      {/* Desempenho */}
      <section className={cn(container, sectionTop, "flex flex-col gap-10")}>
        <div className="flex max-w-[640px] flex-col gap-3">
          <span className={eyebrow}>{landingPerformance.eyebrow}</span>
          <h2 className={h2}>{landingPerformance.title}</h2>
          <p className={lead}>{landingPerformance.text}</p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <PerformanceCard />
          <PhonePanel />
        </div>
      </section>

      {/* Evidências com fonte e ressalva (sem promessa de resultado) */}
      <EvidenceSection />

      {/* Avaliações reais: só aparece quando houver depoimentos em landingTestimonials.items */}
      <TestimonialsSection />

      {/* Perguntas */}
      <section id="perguntas" className={cn(container, sectionTop, "grid scroll-mt-24 grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]")}>
        <div className="flex flex-col gap-3">
          <span className={eyebrow}>{landingFaq.eyebrow}</span>
          <h2 className={h2}>{landingFaq.title}</h2>
          {landingFaq.contactLine ? <p className="m-0 text-ink-muted">{landingFaq.contactLine}</p> : null}
        </div>
        <LandingFaq />
      </section>

      {/* CTA final */}
      <section className="px-3 pt-16 lg:px-6 lg:pt-24">
        <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-3xl">
          <Image src={landingFinalCta.image.src} alt="" fill sizes="(min-width: 1232px) 1232px, 100vw" className="object-cover object-[center_35%]" />
          <div className="relative flex flex-col items-center gap-4 bg-cta-overlay px-5 pb-7 pt-10 text-center lg:px-14 lg:py-16">
            <h2 className={cn(h2, "max-w-[620px] font-black text-white")}>{landingFinalCta.title}</h2>
            <p className={cn(leadLarge, "max-w-[480px] text-[#dbeafe]")}>{landingFinalCta.text}</p>
            <Link
              href={landingLinks.signUp}
              className="mt-2 inline-flex h-12 items-center rounded-lg bg-[#ffffff] px-6 text-[15px] font-medium text-[#1e3a8a] no-underline focus-visible:outline-white"
            >
              {landingFinalCta.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className={cn(container, "flex flex-col gap-6 pb-8 pt-12")}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Link href="/" className="flex items-center no-underline">
            <Logo size="xs" />
          </Link>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
            {landingNav.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-ink-muted no-underline hover:text-ink">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-border pt-5 text-[13px] text-ink-muted">
          <span>{landingFooter.copyright}</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureText({
  tag,
  title,
  text,
  children,
}: {
  tag: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3.5">
      <span className={tagPill}>{tag}</span>
      <h3 className={h3}>{title}</h3>
      <p className={cn(lead, "max-w-[440px]")}>{text}</p>
      {children}
    </div>
  );
}

function FeatureLink({ label }: { label: string }) {
  return (
    <Link href={landingLinks.signUp} className="flex items-center gap-1.5 font-medium text-brand-strong no-underline hover:underline">
      {label}
      <IconArrowRight size={16} strokeWidth={2} />
    </Link>
  );
}

function QuizFeature() {
  const { quiz } = landingResources;
  const m = quiz.mock;
  return (
    <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-16">
      <FeatureText tag={quiz.tag} title={quiz.title} text={quiz.text}>
        <FeatureLink label={quiz.link} />
      </FeatureText>
      <div className={mockPanel}>
        <div className={mockCard}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-bold leading-[26px]">{m.title}</span>
            <IllustrativeBadge />
          </div>
          <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-strong p-3">
            <span className="grid size-10 flex-none place-items-center rounded-[8px] bg-brand-tint text-brand-strong">
              <IconFile size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{m.fileName}</div>
              <div className="text-xs font-medium leading-4 text-ink-muted">{m.fileMeta}</div>
            </div>
            <span className="text-success" role="img" aria-label={m.fileSentLabel}>
              <IconCheck size={20} strokeWidth={2} />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium leading-4">{m.questionsLabel}</span>
              <div className="box-border flex h-11 items-center rounded-[8px] border-[1.5px] border-border-strong px-3">{m.questionsValue}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium leading-4">{m.difficultyLabel}</span>
              <div className="box-border flex h-11 items-center justify-between rounded-[8px] border-[1.5px] border-border-strong px-3">
                {m.difficultyValue}
                <IconChevronDown size={16} strokeWidth={2} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {m.topics.map((topic) => (
              <span
                key={topic.label}
                className={cn(
                  "rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-medium leading-4",
                  topic.selected ? "border-brand bg-brand-tint text-brand-strong" : "border-border-strong text-ink-muted",
                )}
              >
                {topic.label}
              </span>
            ))}
          </div>
          <span className="grid h-12 place-items-center rounded-lg bg-brand text-[15px] font-medium text-on-brand" aria-hidden="true">
            {m.button}
          </span>
        </div>
      </div>
    </div>
  );
}

function FlashcardFeature() {
  const { flashcards } = landingResources;
  const m = flashcards.mock;
  return (
    <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-16">
      <FeatureText tag={flashcards.tag} title={flashcards.title} text={flashcards.text}>
        <FeatureLink label={flashcards.link} />
      </FeatureText>
      <div className={cn(mockPanel, "lg:-order-1")}>
        <div className="relative">
          <div className="absolute inset-[12px_-8px_-12px_8px] rounded-2xl bg-brand-soft" />
          <div className={cn(mockCard, "relative")}>
            <div className="flex items-center justify-between gap-2 text-xs font-medium leading-4 text-ink-muted">
              <span>{m.meta}</span>
              <IllustrativeBadge />
            </div>
            <div className="flex flex-col gap-3 py-2 text-center">
              <span className="text-xl font-bold leading-7 [text-wrap:balance]">{m.question}</span>
              <span className="h-px bg-border" />
              <span className="text-[17px] leading-[26px]">{m.answer}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {m.grades.map((grade) => (
                <div
                  key={grade.label}
                  className={cn(
                    "rounded-lg border-[1.5px] px-1 py-2 text-center",
                    grade.selected ? "border-brand bg-brand-tint" : "border-border-strong",
                  )}
                >
                  <div className={cn("text-[13px] font-medium leading-4", grade.selected && "text-brand-strong")}>{grade.label}</div>
                  <div className={cn("text-xs font-medium leading-4", grade.selected ? "text-brand-strong" : "text-ink-muted")}>
                    {grade.interval}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EssayFeature() {
  const { essay } = landingResources;
  const m = essay.mock;
  return (
    <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-2 lg:gap-16">
      <FeatureText tag={essay.tag} title={essay.title} text={essay.text}>
        <Link
          href={landingLinks.signUp}
          className="inline-flex h-12 items-center rounded-lg border-[1.5px] border-border-strong px-5 text-[15px] font-medium text-ink no-underline transition-colors hover:bg-surface-muted"
        >
          {essay.button}
        </Link>
      </FeatureText>
      <div className={mockPanel}>
        <div className={mockCard}>
          <IllustrativeBadge className="self-start" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold leading-[26px]">{m.title}</div>
              <div className="text-xs font-medium leading-4 text-ink-muted">{m.meta}</div>
            </div>
            <div className="flex-none text-right">
              <div className="text-4xl font-black leading-10 text-brand">{m.score}</div>
              <div className="text-xs font-medium leading-4 text-ink-muted">{m.scoreOf}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {m.competencies.map((c) => (
              <div key={c.id} className="grid grid-cols-[28px_minmax(0,1fr)_36px] items-center gap-2.5">
                <span className="text-[13px] font-medium leading-4 text-ink-muted">{c.id}</span>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] leading-[18px]">{c.name}</span>
                  <div className="h-1.5 rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${c.score / 2}%` }} />
                  </div>
                </div>
                <span className="text-right text-[13px] font-medium leading-4">{c.score}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5 rounded-lg bg-warning-tint p-3 text-warning">
            <IconAlert size={16} strokeWidth={2} className="mt-0.5 flex-none" />
            <span className="text-[13px] leading-5">{m.warning}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const trioCard = "flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4 shadow-card lg:p-6";

function SimuladoCard() {
  const { simulado } = landingResources.cards;
  const m = simulado.mock;
  return (
    <div className={trioCard}>
      <div className="box-border flex h-60 flex-col gap-3 rounded-2xl bg-surface-muted p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium leading-4">{m.name}</span>
          <IllustrativeBadge className="bg-surface" />
        </div>
        <span className="flex items-center gap-1.5 self-start rounded-full bg-warning-tint px-2.5 py-1 font-mono text-xs font-medium leading-4 text-warning">
          <IconClock size={14} strokeWidth={2} />
          {m.timer}
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium leading-4 text-ink-muted">{m.progressLabel}</span>
          <div className="h-1.5 rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand" style={{ width: `${m.progress}%` }} />
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          {m.areas.map((area) => (
            <div key={area.name} className="flex justify-between text-[13px] leading-[18px]">
              <span>{area.name}</span>
              <span className="font-medium">{area.value}</span>
            </div>
          ))}
        </div>
      </div>
      <h3 className="m-0 text-lg font-bold leading-[26px]">{simulado.title}</h3>
      <p className="m-0 text-ink-muted">{simulado.text}</p>
    </div>
  );
}

function ChatCard() {
  const { chat } = landingResources.cards;
  return (
    <div className={trioCard}>
      <div className="relative h-60">
        <Image
          src={chat.image.src}
          alt={chat.image.alt}
          fill
          sizes="(min-width: 1024px) 340px, 92vw"
          className="rounded-3xl object-cover object-[50%_40%]"
        />
        <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1.5 rounded-2xl bg-surface p-2.5 shadow-pop">
          <span className="max-w-[85%] self-end rounded-[12px_12px_4px_12px] bg-brand px-2.5 py-1.5 text-[13px] leading-[19px] text-on-brand">
            {chat.question}
          </span>
          <span className="max-w-[94%] self-start rounded-[12px_12px_12px_4px] bg-surface-muted px-2.5 py-1.5 text-[13px] leading-[19px]">
            {chat.answerPrefix} <code className="font-mono text-xs font-medium leading-[19px] text-brand-strong">{chat.formula}</code>
          </span>
        </div>
        <IllustrativeBadge className="absolute right-2.5 top-2.5 bg-surface" />
      </div>
      <h3 className="m-0 text-lg font-bold leading-[26px]">{chat.title}</h3>
      <p className="m-0 text-ink-muted">{chat.text}</p>
    </div>
  );
}

function PlanCard() {
  const { plan } = landingResources.cards;
  return (
    <div className={trioCard}>
      <div className="relative h-60">
        <Image
          src={plan.image.src}
          alt={plan.image.alt}
          fill
          sizes="(min-width: 1024px) 340px, 92vw"
          className="rounded-3xl object-cover object-[50%_30%]"
        />
        <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1 rounded-2xl bg-surface p-2 shadow-pop">
          {plan.days.map((d) => (
            <div key={d.day} className="flex items-center gap-2 px-1.5 py-[5px]">
              <span className="w-[30px] text-xs font-medium leading-4 text-ink-muted">{d.day}</span>
              <span className="flex-1 text-[13px] font-medium leading-[18px]">{d.subject}</span>
              <span className="text-xs font-medium leading-4 text-ink-muted">{d.minutes}</span>
              {d.done ? (
                <span role="img" aria-label={plan.doneLabel} className="grid size-[18px] place-items-center rounded-full bg-success text-surface">
                  <IconCheck size={11} strokeWidth={3} />
                </span>
              ) : (
                <span className="box-border size-[18px] rounded-full border-[1.5px] border-border-strong" />
              )}
            </div>
          ))}
        </div>
        <IllustrativeBadge className="absolute right-2.5 top-2.5 bg-surface" />
      </div>
      <h3 className="m-0 text-lg font-bold leading-[26px]">{plan.title}</h3>
      <p className="m-0 text-ink-muted">{plan.text}</p>
    </div>
  );
}

function PerformanceCard() {
  const c = landingPerformance.card;
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-4 shadow-card lg:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold leading-[26px]">{c.title}</span>
        <IllustrativeBadge />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {c.stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-surface-muted px-4 py-3.5">
            <div className="text-xs font-medium leading-4 text-ink-muted">{stat.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-black leading-[34px] text-brand">{stat.value}</span>
              {"delta" in stat ? <span className="text-xs font-medium leading-4 text-success">{stat.delta}</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[15px] font-bold leading-5">{c.chartTitle}</span>
            <span className="flex gap-3 text-xs font-medium leading-4 text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-brand" />
                {c.legendHit}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 border-t-2 border-dashed border-cyan" />
                {c.legendGoal}
              </span>
            </span>
          </div>
          <div className="relative flex h-40 items-end gap-2.5 border-b border-border">
            {c.weeks.map((week, index) => (
              <div
                key={index}
                className="box-border flex flex-1 items-end justify-center rounded-[8px_8px_2px_2px] bg-brand pb-1.5"
                style={{ height: `${week}%` }}
              >
                <span className="text-[11px] font-medium leading-[14px] text-on-brand">{week}%</span>
              </div>
            ))}
            <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-cyan" style={{ bottom: `${c.goal}%` }} />
          </div>
          <div className="flex gap-2.5">
            {c.weeks.map((_, index) => (
              <span key={index} className="flex-1 text-center text-xs font-medium leading-4 text-ink-muted">
                S{index + 1}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3.5">
          <span className="text-[15px] font-bold leading-5">{c.bySubjectTitle}</span>
          {c.subjects.map((subject) => (
            <div key={subject.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{subject.name}</span>
                <span className="flex items-center gap-2">
                  {subject.review ? (
                    <span className="flex items-center gap-1 rounded-full bg-warning-tint px-2 py-0.5 text-xs font-medium leading-4 text-warning">
                      <IconRotate size={12} strokeWidth={2.5} />
                      {c.reviewLabel}
                    </span>
                  ) : null}
                  <span className="text-[13px] font-medium leading-4">{subject.value}%</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-muted">
                <div className={cn("h-full rounded-full", subject.review ? "bg-cyan" : "bg-brand")} style={{ width: `${subject.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhonePanel() {
  const p = landingPerformance.phone;
  return (
    <div className="box-border grid min-h-[440px] place-items-center rounded-3xl bg-brand-tint px-5 py-8 lg:min-h-[500px]" aria-hidden="true">
      <div className="relative box-border h-[436px] w-[212px] rounded-[34px] bg-[#0b1220] p-[7px] shadow-pop">
        <div className="relative box-border flex h-full flex-col gap-2.5 overflow-hidden rounded-[28px] bg-bg px-3 pb-3 pt-[30px]">
          <span className="absolute left-1/2 top-[9px] h-3.5 w-14 -translate-x-1/2 rounded-full bg-[#0b1220]" />
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold leading-[18px]">{p.title}</span>
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium leading-3 text-ink-muted">{p.badge}</span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <div className="text-[10px] font-medium leading-[14px] text-ink-muted">{p.weekLabel}</div>
            <div className="text-2xl font-black leading-7 text-brand">{p.weekValue}</div>
            <div className="mt-1.5 flex h-11 items-end gap-1">
              {landingPerformance.card.weeks.map((week, index) => (
                <span key={index} className="flex-1 rounded-[3px] bg-brand" style={{ height: `${week}%` }} />
              ))}
            </div>
          </div>
          <span className="text-[11px] font-medium leading-[14px] text-ink-muted">{p.reviewTitle}</span>
          {p.items.map((item) => (
            <div key={item.name} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface p-2">
              <span className="grid size-5 place-items-center rounded-full bg-warning-tint text-warning">
                <IconRotate size={11} strokeWidth={2.5} />
              </span>
              <span className="flex-1 text-[11px] font-medium leading-[14px]">{item.name}</span>
              <span className="text-[11px] font-medium leading-[14px]">{item.value}</span>
            </div>
          ))}
          <div className="mt-auto grid h-9 place-items-center rounded-[10px] bg-brand text-xs font-medium leading-4 text-on-brand">{p.button}</div>
        </div>
      </div>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-px grid size-[22px] flex-none place-items-center rounded-full bg-success-tint text-success">
        <IconCheck size={13} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}

function PricingCard({ tier }: { tier: "free" | "basic" | "full" }) {
  const p = landingPlans;
  const plan = p[tier];
  const featured = tier === "full";
  const perDay = pricePerDayLabel(tier);
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-3xl bg-surface px-4 py-7 lg:px-6",
        featured ? "border-2 border-brand shadow-pop" : "border border-border shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[22px] font-bold leading-7">{plan.name}</span>
          <span className="text-ink-muted lg:min-h-12">{plan.description}</span>
        </div>
        {"badge" in plan ? (
          <span className="flex-none rounded-full bg-brand px-2.5 py-1 text-xs font-medium leading-4 text-on-brand">{plan.badge}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black leading-[42px] tracking-[-0.5px]">{plan.price}</span>
          <span className="text-ink-muted">{plan.period}</span>
        </div>
        {perDay ? <span className="text-sm font-medium text-brand-strong">{perDay}</span> : <span className="text-sm font-medium text-brand-strong">Sem cartão de crédito</span>}
      </div>
      <div className="flex flex-col gap-3">
        {planHighlights(tier).map((item) => (
          <PlanFeature key={item}>
            <strong className="font-medium">{item}</strong>
          </PlanFeature>
        ))}
        <span className="mt-1 text-[13px] font-medium uppercase tracking-[0.4px] text-ink-muted">{tier === "free" ? p.includedTitle : "Tudo do plano anterior, mais"}</span>
        {tier === "free" ? (
          p.included.map((item) => <PlanFeature key={item}>{item}</PlanFeature>)
        ) : tier === "basic" ? (
          <>
            <PlanFeature>Quizzes e flashcards gerados por IA</PlanFeature>
            <PlanFeature>Redação por foto e vídeos do YouTube</PlanFeature>
            <PlanFeature>Trilha de estudos com troféus</PlanFeature>
          </>
        ) : (
          <>
            <PlanFeature>Os limites mais altos de IA</PlanFeature>
            <PlanFeature>Simulados gerados por IA todo dia</PlanFeature>
            <PlanFeature>Arquivos de até {uploadLimitMB("full")} MB</PlanFeature>
          </>
        )}
      </div>
      <Link
        href={tier === "full" ? landingLinks.signUpFull : tier === "basic" ? landingLinks.signUpBasic : landingLinks.signUp}
        className={cn(
          "mt-auto grid h-12 place-items-center rounded-lg text-[15px] font-medium no-underline transition-colors",
          featured ? "bg-brand text-on-brand hover:bg-brand-strong" : "border-[1.5px] border-border-strong text-ink hover:bg-surface-muted",
        )}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

function PlansSection() {
  const p = landingPlans;
  return (
    <section id="planos" className={cn(container, sectionTop, "flex scroll-mt-24 flex-col gap-10")}>
      <div className="flex max-w-[640px] flex-col gap-3">
        <span className={eyebrow}>{p.eyebrow}</span>
        <h2 className={h2}>{p.title}</h2>
        <p className={lead}>{p.text}</p>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <PricingCard tier="free" />
        <PricingCard tier="basic" />
        <PricingCard tier="full" />
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="m-0 text-xl font-bold text-ink">Compare os planos, número por número</h3>
        <PlanComparisonTable />
        <p className="m-0 text-[13px] text-ink-muted">
          Os limites diários voltam à meia-noite e os semanais, na segunda-feira, no horário de Brasília. Todo limite tem um teto: não existe uso ilimitado.
        </p>
      </div>
      <div className="flex items-center justify-center gap-2.5 text-center text-ink-muted">
        <IconShield size={18} className="flex-none" />
        <span>{p.guarantee}</span>
      </div>
    </section>
  );
}

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Easy Education",
  description: "Plataforma de estudos com IA para qualquer estudante: quiz, flashcards, simulados, plano de estudos e correção de redação a partir do próprio material.",
  offers: [landingPlans.free, landingPlans.basic, landingPlans.full].map((plan) => ({
    "@type": "Offer",
    name: `Plano ${plan.name}`,
    price: plan.price === "Grátis" ? "0" : plan.price.replace(/[^\d,]/g, "").replace(",", "."),
    priceCurrency: "BRL",
    category: "subscription",
  })),
};
