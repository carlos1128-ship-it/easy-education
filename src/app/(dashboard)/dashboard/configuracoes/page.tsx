import { Shield, UserRound } from "lucide-react";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function ConfiguraçõesPage() {
  const user = await getCurrentUserOrRedirect();
  const profile = await getPrisma().profile.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Configurações</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Preferências da conta</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Perfil de estudo</h2>
              <p className="text-sm text-[#64748B]">Dados usados pela IA para personalizar planos, quizzes e revisões.</p>
            </div>
          </div>

          <ProfileSettingsForm
            name={profile?.name ?? user.email ?? "Aluno Easy"}
            studyGoal={profile?.studyGoal ?? "ENEM"}
            dailyMinutes={profile?.dailyMinutes ?? 60}
            studyMethod={profile?.studyMethod ?? "Pomodoro"}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Shield className="size-5 text-[#4F46E5]" />
              <h2 className="font-bold text-[#0F172A]">Segurança</h2>
            </div>
            <p className="text-sm text-[#64748B]">Sessão protegida. Use sair no menu para encerrar neste dispositivo.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
