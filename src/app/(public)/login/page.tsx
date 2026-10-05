import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/auth/auth-forms";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 py-10">
      <section className="w-full max-w-[440px] rounded-3xl border border-border bg-surface px-6 py-9 shadow-pop sm:px-8">
        <div className="flex flex-col items-center text-center">
          <Image src="/brand/icone-azul.svg" alt="" width={64} height={64} unoptimized preload className="size-16 drop-shadow-[0_8px_16px_rgba(37,99,235,0.3)] dark:hidden" />
          <Image src="/brand/icone-escuro.svg" alt="" width={64} height={64} unoptimized preload className="hidden size-16 dark:block" />
          <p className="m-0 mt-4 text-[13px] font-semibold text-brand-strong">Easy Education</p>
          <h1 className="m-0 mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ink">Bem-vindo de volta!</h1>
          <p className="m-0 mt-2 text-[15px] text-ink-muted">Entre com seus dados para continuar estudando.</p>
        </div>
        <div className="mt-8">
          <Suspense fallback={<LoadingSpinner />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
