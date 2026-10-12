import { Header } from "@/components/layout/header";
import { PlanProvider } from "@/components/plan/plan-provider";
import { MobileBottomNav, Sidebar } from "@/components/layout/sidebar";
import { ProductTour } from "@/components/onboarding/product-tour";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { StudyRunAside, StudyRunBar } from "@/components/study-plan/study-run-panel";
import { StudyRunProvider } from "@/components/study-plan/study-run-provider";
import { ensureProfileForUser } from "@/lib/profile";
import { getStudentOrRedirect } from "@/lib/server-user";
import { getUsageSnapshot } from "@/lib/usage";
import { getGamification } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, access } = await getStudentOrRedirect();
  const [profile, usage, stats] = await Promise.all([ensureProfileForUser(user), getUsageSnapshot(user, { tier: access.tier }), getGamification(user.id)]);

  return (
    <PlanProvider tier={access.tier} usage={usage.features}>
    <StudyRunProvider>
    <div className="flex min-h-dvh overflow-x-hidden bg-background text-foreground lg:h-dvh lg:overflow-hidden">
      <RealtimeRefresh userId={user.id} />
      <div className="hidden lg:block">
        <Sidebar profileName={profile.name} studyGoal={profile.studyGoal} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header profileName={profile.name} studyGoal={profile.studyGoal} stats={stats} />
        {/* Roteiro recolhível até telas largas; em monitores amplos, ocupa uma coluna própria. */}
        <StudyRunBar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-28 sm:p-5 sm:pb-32 md:p-8 md:pb-32 lg:overflow-y-auto lg:pb-8">{children}</main>
      </div>
      <StudyRunAside />
      <MobileBottomNav />
      {/* Primeira vez no app: tutorial guiado abre sozinho no Início. */}
      <ProductTour autoStart={profile.onboardingDone && !profile.tourCompletedAt} />
    </div>
    </StudyRunProvider>
    </PlanProvider>
  );
}
