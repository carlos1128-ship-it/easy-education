import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookMarked, Library, RotateCcw, ShieldCheck, Timer } from "lucide-react";
import { evidenceDisclaimer, evidenceItems } from "@/content/evidence";
import { landingTestimonials } from "@/content/landing";
import { cn } from "@/lib/utils";

const container = "mx-auto max-w-[1520px] px-5 lg:px-12 2xl:px-16";
const sectionTop = "pt-16 lg:pt-24";
const eyebrow = "text-[13px] font-medium uppercase leading-4 tracking-[0.6px] text-brand-strong";
const h2 = "m-0 text-[28px] font-bold leading-[34px] tracking-[-0.5px] [text-wrap:balance] lg:text-4xl lg:leading-[42px]";
const lead = "m-0 text-[15px] leading-[26px] text-ink-muted lg:text-[17px]";

const bankPoints = [
  { icon: Library, title: "Filtros de verdade", text: "Por exame, ano, matéria, assunto e dificuldade. Ou só as que você ainda não respondeu e as que errou." },
  { icon: BookMarked, title: "Resolução comentada em cada questão", text: "Escrita por IA e conferida contra o gabarito oficial. Se discordar dele, a questão não é publicada." },
  { icon: RotateCcw, title: "O que você erra volta na hora certa", text: "As questões erradas ou marcadas entram numa revisão com intervalos crescentes." },
  { icon: Timer, title: "Simulados de provas anteriores", text: "Questões originais, na ordem da prova, com cronômetro. O resultado é uma estimativa baseada no seu desempenho, não a nota oficial." },
] as const;

/** Banco de questões: o que é, de onde vêm as questões e o que ele não promete. */
export function BankSection() {
  return (
    <section id="banco" className={cn(container, sectionTop, "flex scroll-mt-6 flex-col gap-10")}>
      <div className="flex max-w-[680px] flex-col gap-3">
        <span className={eyebrow}>Banco de questões</span>
        <h2 className={h2}>Questões de provas anteriores, sem baixar nada</h2>
        <p className={lead}>Responda no próprio site, com gabarito e resolução. Funciona em todos os planos, inclusive o Gratuito, e não gasta o seu limite de IA.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {bankPoints.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
            <span className="grid size-11 flex-none place-items-center rounded-lg bg-brand-tint text-brand-strong">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-[17px] font-bold text-ink">{title}</h3>
              <p className="m-0 text-ink-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="m-0 flex max-w-[860px] items-start gap-2.5 text-[14px] leading-6 text-ink-muted">
        <ShieldCheck size={18} className="mt-0.5 flex-none text-brand-strong" aria-hidden="true" />
        <span>
          Cada questão mostra a prova, o ano e a fonte. Hoje o banco começa pelo ENEM, e outros exames entram aos poucos. Questões criadas por IA aparecem sempre com o selo &ldquo;Gerada por IA&rdquo;, nunca como questão de prova. A IA pode errar: toda questão tem o botão &ldquo;Reportar&rdquo;.
        </span>
      </p>
    </section>
  );
}

/** Evidências sobre métodos de estudo, com fonte e ressalva. Nenhuma promessa de resultado sobre o produto. */
export function EvidenceSection() {
  return (
    <section id="evidencias" className={cn(container, sectionTop, "flex scroll-mt-6 flex-col gap-10")}>
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
    <section id="avaliacoes" className={cn(container, sectionTop, "flex scroll-mt-6 flex-col gap-10")}>
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
