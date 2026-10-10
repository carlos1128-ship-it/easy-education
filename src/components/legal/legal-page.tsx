import Link from "next/link";
import type { LegalSection } from "@/content/legal";
import { LEGAL_ENTITY, LEGAL_VERSION, SUPPORT_EMAIL, legalLinks, supportMailto } from "@/lib/site";

/** Página pública de texto legal (Termos de Uso e Política de Privacidade), com o contato no fim. */
export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-ink">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/" className="w-fit text-sm font-semibold text-brand-strong no-underline hover:underline">
            ← Voltar ao site
          </Link>
          <h1 className="m-0 text-[32px] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
          <p className="m-0 text-[13px] text-ink-muted">Versão de {LEGAL_VERSION}</p>
          <p className="m-0 text-[16px] leading-7 text-ink-muted">{intro}</p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="m-0 text-[20px] font-bold leading-7">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="m-0 text-[15px] leading-7 text-ink">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="flex flex-col gap-2 rounded-2xl bg-surface-muted p-5 text-[15px] leading-7">
          <h2 className="m-0 text-[18px] font-bold">Contato</h2>
          <p className="m-0">Responsável: {LEGAL_ENTITY}.</p>
          {SUPPORT_EMAIL ? (
            <p className="m-0">
              E-mail:{" "}
              <a href={supportMailto(title)} className="font-semibold text-brand-strong">
                {SUPPORT_EMAIL}
              </a>
            </p>
          ) : (
            <p className="m-0">Se você já tem conta, fale com a gente pela página Configurações do app.</p>
          )}
        </section>

        <nav aria-label="Documentos legais" className="flex gap-5 text-sm">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink-muted no-underline hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
