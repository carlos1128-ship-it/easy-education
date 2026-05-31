import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0A0F1C] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-sm text-[#1B4FD8]">Easy Education</p>
        <h1 className="mt-2 text-2xl font-medium text-slate-950">Entrar</h1>
        <p className="mt-2 text-sm text-slate-500">Continue de onde parou nos seus estudos.</p>
        <div className="mt-6">
          <Suspense fallback={<LoadingSpinner />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
