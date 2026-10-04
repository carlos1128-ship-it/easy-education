"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { navItems } from "@/lib/app-data";
import { getProfileInitials } from "@/lib/subjects";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const mobileNavItems = [
  { href: "/dashboard", label: "Início" },
  { href: "/dashboard/chat", label: "Chat IA" },
  { href: "/dashboard/quizzes", label: "Quizzes" },
  { href: "/dashboard/flashcards", label: "Flashcards" },
  { href: "/dashboard/plano", label: "Plano" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

const navLinkClass = (active: boolean) =>
  cn(
    "flex min-h-10 items-center gap-3 whitespace-nowrap rounded-lg px-3 text-sm no-underline transition-colors",
    active ? "bg-brand-tint font-medium text-brand-strong" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
  );

function SidebarContent({ onNavigate, profileName, studyGoal }: { onNavigate?: () => void; profileName: string; studyGoal?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const mainItems = navItems.filter((item) => item.group === "Menu Principal");
  const studyItems = navItems.filter((item) => item.group === "Meus Estudos");
  const footerItems = navItems.filter((item) => item.group === "Footer");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Você saiu da conta.");
    router.push("/");
    onNavigate?.();
  }

  function renderItem(item: (typeof navItems)[number]) {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active)}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <aside className="flex h-full w-[248px] flex-shrink-0 flex-col border-r border-border bg-sidebar px-4 py-5 text-ink">
      <Link href="/dashboard" prefetch={false} onClick={onNavigate} className="px-2 pb-5 pt-1 no-underline">
        <Logo size="md" />
      </Link>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-card">
        <div className="grid size-10 flex-shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">
          {getProfileInitials(profileName).toUpperCase()}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p title={profileName} className="m-0 line-clamp-2 text-sm font-bold leading-[1.3] text-ink">
            {profileName}
          </p>
          <span className="self-start whitespace-nowrap rounded-full bg-brand-tint px-2 py-[5px] text-xs font-medium leading-none text-brand-strong">
            {studyGoal ?? "Plano ativo"}
          </span>
        </div>
        <Link
          href="/dashboard/configuracoes"
          prefetch={false}
          onClick={onNavigate}
          aria-label="Opções do perfil"
          className="-mr-1.5 -mt-1 grid size-7 flex-shrink-0 place-items-center rounded-[8px] text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <MoreVertical size={18} strokeWidth={3} aria-hidden="true" />
        </Link>
      </div>

      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <div className="px-3 pb-2 pt-6 text-xs font-medium uppercase tracking-[0.06em] text-ink-muted">Menu principal</div>
        <nav aria-label="Menu principal" className="flex flex-col gap-0.5">
          {mainItems.map(renderItem)}
        </nav>
        <div className="px-3 pb-2 pt-6 text-xs font-medium uppercase tracking-[0.06em] text-ink-muted">Meus estudos</div>
        <nav aria-label="Meus estudos" className="flex flex-col gap-0.5 pb-4">
          {studyItems.map(renderItem)}
        </nav>
      </div>

      {onNavigate ? (
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-sm text-ink-muted">Tema</span>
          <ThemeToggle />
        </div>
      ) : null}
      <nav aria-label="Conta" className="flex flex-col gap-0.5 border-t border-border pt-3">
        {footerItems.map(renderItem)}
        <button type="button" className={cn(navLinkClass(false), "w-full text-left")} onClick={handleLogout}>
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </nav>
    </aside>
  );
}

export function Sidebar({ profileName, studyGoal }: { profileName: string; studyGoal?: string }) {
  return <SidebarContent profileName={profileName} studyGoal={studyGoal} />;
}

export function MobileSidebar({ profileName, studyGoal }: { profileName: string; studyGoal?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden">
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
        <span className="sr-only">Abrir menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[248px] gap-0 border-border p-0" showCloseButton={false}>
        <SidebarContent onNavigate={() => setOpen(false)} profileName={profileName} studyGoal={studyGoal} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = mobileNavItems
    .map((mobileItem) => {
      const item = navItems.find((navItem) => navItem.href === mobileItem.href);
      return item ? { ...item, label: mobileItem.label } : null;
    })
    .filter(Boolean) as Array<(typeof navItems)[number]>;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-1 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-1.5 lg:hidden"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-[3px] whitespace-nowrap rounded-lg text-xs no-underline",
                active ? "font-medium text-brand-strong" : "text-ink-muted",
              )}
            >
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
