import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { evidenceDisclaimer, evidenceItems } from "@/content/evidence";
import { landingTestimonials } from "@/content/landing";
import { cn } from "@/lib/utils";

const container = "mx-auto max-w-[1520px] px-5 lg:px-12 2xl:px-16";
const sectionTop = "pt-16 lg:pt-24";
const eyebrow = "text-[13px] font-medium uppercase leading-4 tracking-[0.6px] text-brand-strong";
const h2 = "m-0 text-[28px] font-bold leading-[34px] tracking-[-0.5px] [text-wrap:balance] lg:text-4xl lg:leading-[42px]";
const lead = "m-0 text-[15px] leading-[26px] text-ink-muted lg:text-[17px]";

/** Evidências sobre métodos de estudo, com fonte e ressalva. Nenhuma promessa de resultado sobre o produto. */
export function EvidenceSection() {
  return (
    <section id="evidencias" className={cn(container, sectionTop, "flex scroll-mt-24 flex-col gap-10")}>
      <div className="flex max-w-[680px] flex-col gap-3">
        <span className={eyebrow}>O que a pesquisa diz</span>
        <h2 className={h2}>Por que o app é feito de questões, revisão e devolutiva</h2>
        <p className={lead}>Estas ideias vêm de estudos publicados sobre como a gente aprende. Cada uma traz quem foi estudado, os números e o que ela não prova.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {evidenceItems.map((item) => (
          <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
            <h3 className="m-0 text-[18px] font-bold leading-6 text-ink">{item.title}</h3>
            <p className="m-0 text-ink">{item.summary}</p>
            <p className="m-0 text-[13px] leading-5 text-ink-muted">
              <strong className="font-semibold text-ink">O que não dá para concluir: </strong>
              {item.caveat}
            </p>
            <p className="m-0 mt-auto text-[12px] leading-5 text-ink-muted">
              Fonte:{" "}
              <a href={item.reference.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                {item.reference.citation}
              </a>
            </p>
          </article>
        ))}
      </div>
      <div className="flex flex-col gap-3 text-[14px] leading-6 text-ink-muted">
        <p className="m-0 max-w-[860px]">{evidenceDisclaimer}</p>
        <Link href="/evidencias" className="inline-flex w-fit items-center gap-1.5 font-semibold text-brand-strong no-underline hover:underline">
          Ver os detalhes e as referências
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/** Avaliações reais. Só aparece quando `landingTestimonials.items` tiver depoimentos reais e autorizados. */
export function TestimonialsSection() {
  const { items } = landingTestimonials;
  if (!items.length) return null;
  return (
    <section id="avaliacoes" className={cn(container, sectionTop, "flex scroll-mt-24 flex-col gap-10")}>
      <div className="flex max-w-[680px] flex-col gap-3">
        <span className={eyebrow}>{landingTestimonials.eyebrow}</span>
        <h2 className={h2}>{landingTestimonials.title}</h2>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={`${item.name}-${item.text.slice(0, 24)}`} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
            <blockquote className="m-0 text-ink [text-wrap:pretty]">{item.text}</blockquote>
            <div className="mt-auto flex items-center gap-3">
              {item.photo ? (
                <Image src={item.photo} alt="" width={44} height={44} className="size-11 rounded-full object-cover" />
              ) : (
                <span className="grid size-11 place-items-center rounded-full bg-brand-tint text-[15px] font-bold text-brand-strong" aria-hidden="true">
                  {item.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-ink">{item.name}</span>
                {item.source ? <span className="text-[13px] text-ink-muted">{item.source}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
