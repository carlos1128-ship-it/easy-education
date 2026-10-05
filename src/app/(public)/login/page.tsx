import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function LoginPage() {
  return (
    <AuthShell title="Bem-vindo de volta!" subtitle="Entre com seus dados para continuar estudando.">
      <Suspense fallback={<LoadingSpinner />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
