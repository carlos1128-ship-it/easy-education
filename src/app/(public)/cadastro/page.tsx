import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";

export default function CadastroPage() {
  return (
    <AuthShell title="Bem-vindo!" subtitle="Crie sua conta e tenha seu plano de estudos pronto em poucos minutos.">
      <SignUpForm />
    </AuthShell>
  );
}
