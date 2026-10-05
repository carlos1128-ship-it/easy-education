import { SignUpForm } from "@/components/auth/auth-forms";
import { Logo } from "@/components/brand/logo";

export default function CadastroPage() {
  return (
    <main className="legacy-auth grid min-h-screen place-items-center bg-[#0A0F1C] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 dark:border-[#1A2744] bg-white p-6 shadow-xl">
        <Logo size="sm" preload />
        <h1 className="mt-2 text-2xl font-medium text-slate-950 dark:text-[#F1F5F9]">Crie sua conta</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-[#94A3B8]">Monte seu plano personalizado em poucos minutos.</p>
        <div className="mt-6"><SignUpForm /></div>
      </section>
    </main>
  );
}
