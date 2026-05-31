import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { ensureProfileForUser } from "@/lib/profile";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserOrRedirect();
  await ensureProfileForUser(user);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F6F8FC] text-[#0F172A]">
      <RealtimeRefresh userId={user.id} />
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
