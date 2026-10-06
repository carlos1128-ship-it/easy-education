import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getPaidUserOrRedirect } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await getPaidUserOrRedirect();

  return (
    <main className="legacy-auth min-h-screen bg-[#F8FAFD] dark:bg-[#070A13] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#1B4FD8] dark:text-[#93C5FD]">Último passo</p>
        <h1 className="mt-2 text-3xl font-medium text-slate-950 dark:text-[#F1F5F9]">Vamos montar seu plano de estudos</h1>
        <p className="mt-2 text-slate-500 dark:text-[#94A3B8]">Quatro perguntas rápidas. Com as respostas, a IA monta o seu plano da semana.</p>
        <div className="mt-8"><OnboardingForm /></div>
      </div>
    </main>
  );
}
