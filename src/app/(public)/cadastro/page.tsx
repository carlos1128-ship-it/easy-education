import { SignUpForm } from "@/components/auth/auth-forms";

export default function CadastroPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0A0F1C] px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-sm text-[#1B4FD8]">Easy Education</p>
        <h1 className="mt-2 text-2xl font-medium text-slate-950">Crie sua conta</h1>
        <p className="mt-2 text-sm text-slate-500">Monte seu plano personalizado em poucos minutos.</p>
        <div className="mt-6"><SignUpForm /></div>
      </section>
    </main>
  );
}
