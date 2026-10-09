import type { Metadata } from "next";
import Link from "next/link";
import { evidenceDisclaimer, evidenceItems, evidenceNotes } from "@/content/evidence";

export const metadata: Metadata = {
  title: "Evidências: como a pesquisa apoia o jeito de estudar do Easy Education",
  description: "Estudos sobre prática com testes, revisão espaçada e feedback na escrita, com os números, as ressalvas e as referências.",
};

/** Página pública de evidências: cada afirmação com a fonte, o que o estudo fez e o que não dá para concluir. */
export default function EvidenciasPage() {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-ink">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/" className="w-fit text-sm font-semibold text-brand-strong no-underline hover:underline">
            ← Voltar ao site
          </Link>
          <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-[-0.02em]">Evidências: o que a pesquisa diz sobre estudar</h1>
          <p className="m-0 text-[16px] leading-7 text-ink-muted">
            O Easy Education prioriza questões, revisão espaçada e devolutiva porque a pesquisa apoia essas estratégias. Aqui estão os estudos, com o que cada um encontrou e o que ele <strong>não</strong> prova.
          </p>
          <p className="m-0 rounded-xl bg-surface-muted p-4 text-[14px] leading-6 text-ink">{evidenceDisclaimer}</p>
        </header>

        {evidenceItems.map((item) => (
          <article key={item.id} id={item.id} className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h2 className="m-0 text-[22px] font-bold leading-7">{item.title}</h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-6">
              {item.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <p className="m-0 text-[15px] leading-6 text-ink-muted">
              <strong className="font-semibold text-ink">O que não dá para concluir: </strong>
              {item.caveat}
            </p>
            <p className="m-0 text-[15px] leading-6 text-ink-muted">
              <strong className="font-semibold text-ink">No app: </strong>
              {item.inApp}
            </p>
            <p className="m-0 text-[13px] leading-5 text-ink-muted">
              <strong className="font-semibold text-ink">Referência: </strong>
              <a href={item.reference.url} target="_blank" rel="noopener noreferrer" className="break-words underline underline-offset-2">
                {item.reference.citation}
              </a>
            </p>
          </article>
        ))}

        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h2 className="m-0 text-[20px] font-bold">Outras observações</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-6">
            {evidenceNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
