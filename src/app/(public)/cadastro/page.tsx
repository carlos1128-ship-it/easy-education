import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function CadastroPage() {
  return (
    <AuthShell title="Bem-vindo!" subtitle="Crie sua conta e tenha seu plano de estudos pronto em poucos minutos.">
      <Suspense fallback={<LoadingSpinner />}>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
