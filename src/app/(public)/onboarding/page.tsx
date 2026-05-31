import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFD] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#1B4FD8]">Onboarding</p>
        <h1 className="mt-2 text-3xl font-medium text-slate-950">Vamos personalizar seus estudos</h1>
        <p className="mt-2 text-slate-500">A IA usa essas respostas para criar um plano inicial realista.</p>
        <div className="mt-8"><OnboardingForm /></div>
      </div>
    </main>
  );
}
