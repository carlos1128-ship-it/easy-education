import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsSections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Termos de Uso · Easy Education",
  description: "Regras de uso do Easy Education: planos, teste grátis, cancelamento, garantia de 7 dias e uso da inteligência artificial.",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="As regras para usar o Easy Education, em linguagem direta. Leia antes de assinar."
      sections={termsSections}
    />
  );
}
