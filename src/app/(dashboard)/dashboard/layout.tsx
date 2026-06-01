import { Header } from "@/components/layout/header";
import { MobileBottomNav, Sidebar } from "@/components/layout/sidebar";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { ensureProfileForUser } from "@/lib/profile";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserOrRedirect();
  const profile = await ensureProfileForUser(user);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      <RealtimeRefresh userId={user.id} />
      <div className="hidden lg:block">
        <Sidebar profileName={profile.name} studyGoal={profile.studyGoal} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header profileName={profile.name} studyGoal={profile.studyGoal} />
        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-32 lg:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
