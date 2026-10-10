import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacySections } from "@/content/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade · Easy Education",
  description: "Quais dados o Easy Education coleta, para quê, com quem compartilha e como você exerce seus direitos pela LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Como o Easy Education trata os seus dados, seguindo a Lei Geral de Proteção de Dados (LGPD). Atenção especial a quem tem menos de 18 anos."
      sections={privacySections}
    />
  );
}
