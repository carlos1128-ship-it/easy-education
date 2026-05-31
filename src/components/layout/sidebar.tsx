"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, LogOut, Menu, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "@/lib/app-data";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const mainItems = navItems.filter((item) => item.group === "Menu Principal");
  const studyItems = navItems.filter((item) => item.group === "Meus Estudos");
  const footerItems = navItems.filter((item) => item.group === "Footer");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Você saiu da conta.");
    router.push("/login");
    onNavigate?.();
  }

  function renderItem(item: (typeof navItems)[number]) {
    const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748B] transition-colors hover:bg-[#EEF2FF]/50 hover:text-[#4F46E5]",
          active && "bg-[#EEF2FF] text-[#4F46E5]",
        )}
      >
        {active ? <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#4F46E5]" /> : null}
        <Icon size={18} style={item.accent && !active ? { color: item.accent } : undefined} />
        {item.label}
      </Link>
    );
  }

  return (
    <aside className="flex h-full w-[240px] flex-shrink-0 flex-col border-r border-[#E2E8F0] bg-white text-[#0F172A]">
      <div className="p-6 pb-2">
        <Link href="/dashboard" onClick={onNavigate} className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F46E5] text-white">
            <GraduationCap size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight">Easy Education</span>
        </Link>

        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5]/10 text-sm font-bold text-[#4F46E5]">
            AE
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Aluno Easy</p>
            <span className="rounded bg-[#4F46E5]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">
              Plano ativo
            </span>
          </div>
          <Link href="/dashboard/configuracoes" onClick={onNavigate} className="text-[#64748B] transition-colors hover:text-[#0F172A]" aria-label="Mais opcoes">
            <MoreVertical size={16} />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <nav className="space-y-1">
          <div className="mb-2 mt-2 px-3 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            Menu Principal
          </div>
          {mainItems.map(renderItem)}

          <div className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            Meus Estudos
          </div>
          {studyItems.map(renderItem)}
        </nav>
      </div>

      <div className="border-t border-[#E2E8F0] p-3">
        {footerItems.map(renderItem)}
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#64748B] transition-colors hover:bg-gray-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return <SidebarContent />;
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="flex h-10 w-10 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#EEF2FF] hover:text-[#4F46E5] md:hidden">
        <Menu size={24} />
        <span className="sr-only">Abrir menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] gap-0 border-[#E2E8F0] p-0" showCloseButton={false}>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
