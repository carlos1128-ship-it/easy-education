import Link from "next/link";
import { Shield, Sparkles, UserRound } from "lucide-react";
import { goalLabel, parsePersonalization, PURPOSES } from "@/lib/learner-profile";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function ConfiguraçõesPage() {
  const user = await getCurrentUserOrRedirect();
  const profile = await getPrisma().profile.findUnique({ where: { userId: user.id } });
  const personalization = parsePersonalization(profile?.personalization);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Configurações</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Preferências da conta</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint text-brand-strong">
              <UserRound size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Perfil de estudo</h2>
              <p className="text-sm text-ink-muted">Dados usados pela IA para personalizar planos, quizzes e revisões.</p>
            </div>
          </div>

          <ProfileSettingsForm
            name={profile?.name ?? user.email ?? "Aluno Easy"}
            studyGoal={profile?.studyGoal ?? ""}
            dailyMinutes={profile?.dailyMinutes ?? 60}
            studyMethod={profile?.studyMethod ?? "Pomodoro"}
          />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <Sparkles className="size-5 text-brand-strong" />
              <h2 className="font-bold text-ink">Personalização</h2>
            </div>
            <p className="text-sm text-ink-muted">
              {personalization
                ? `${PURPOSES.find((item) => item.id === personalization.purpose)?.label ?? "Objetivo"}: ${goalLabel(personalization)}. A IA usa isso para escolher o estilo das questões, o jeito de explicar e o seu plano.`
                : "Responda algumas perguntas sobre o que e por que você estuda para a IA ajustar questões, explicações e plano para você."}
            </p>
            <Link
              href="/onboarding"
              prefetch={false}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand no-underline transition-colors hover:bg-brand-strong"
            >
              {personalization ? "Atualizar personalização" : "Personalizar meu estudo"}
            </Link>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <Shield className="size-5 text-brand-strong" />
              <h2 className="font-bold text-ink">Segurança</h2>
            </div>
            <p className="text-sm text-ink-muted">Sessão protegida. Use sair no menu para encerrar neste dispositivo.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
