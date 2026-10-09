import { OnboardingForm, type OnboardingInitial } from "@/components/onboarding/onboarding-form";
import { parsePersonalization } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export const dynamic = "force-dynamic";

const LEVEL_LABELS: Record<string, string> = { iniciante: "Iniciante", "intermediário": "Intermediário", "avançado": "Avançado" };

export default async function OnboardingPage() {
  const { user } = await getStudentOrRedirect();
  const prisma = getPrisma();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const redo = Boolean(profile?.onboardingDone);

  let initial: OnboardingInitial | undefined;
  if (profile && redo) {
    const plan = await prisma.studyPlan.findFirst({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { subjects: { select: { name: true, difficulty: true } } },
    });
    initial = {
      personalization: parsePersonalization(profile.personalization),
      targetDate: profile.targetDate ? profile.targetDate.toISOString().slice(0, 10) : "",
      level: LEVEL_LABELS[profile.level] ?? "Iniciante",
      dailyMinutes: profile.dailyMinutes,
      studyMethod: profile.studyMethod,
      subjects: Object.fromEntries((plan?.subjects ?? []).map((subject) => [subject.name, subject.difficulty])),
    };
  }

  return (
    <main className="legacy-auth min-h-screen bg-[#F8FAFD] dark:bg-[#070A13] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-[#1B4FD8] dark:text-[#93C5FD]">{redo ? "Personalização" : "Último passo"}</p>
        <h1 className="mt-2 text-3xl font-medium text-slate-950 dark:text-[#F1F5F9]">
          {redo ? "Atualize o que você está estudando" : "Vamos montar um estudo do seu jeito"}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-[#94A3B8]">
          {redo
            ? "Mude o que quiser. Ao salvar, a IA refaz o seu plano e passa a gerar questões com as respostas novas."
            : "Cinco etapas rápidas. Com as respostas, a IA ajusta o estilo das questões, o jeito de explicar e o seu plano da semana."}
        </p>
        <div className="mt-8"><OnboardingForm initial={initial} redo={redo} /></div>
      </div>
    </main>
  );
}
