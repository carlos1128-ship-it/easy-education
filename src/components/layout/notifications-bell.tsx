"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ClipboardCheck, Clock, Flame, Layers, Tag, Target, type LucideIcon } from "lucide-react";
import { useLocalStorageValue } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  kind: "ofensiva" | "meta" | "revisao" | "quiz" | "simulado" | "promocao";
  title: string;
  body: string;
  href?: string;
  tone: "brand" | "warning" | "success";
};

const READ_KEY = "ee-notifications-read";

const icons: Record<Notification["kind"], LucideIcon> = {
  ofensiva: Flame,
  meta: Clock,
  revisao: Layers,
  quiz: Target,
  simulado: ClipboardCheck,
  promocao: Tag,
};

const toneClasses: Record<Notification["tone"], string> = {
  brand: "bg-brand-tint text-brand-strong",
  warning: "bg-warning-tint text-warning",
  success: "bg-success-tint text-success",
};

export function NotificationsBell({ className }: { className?: string }) {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [readRaw, setReadRaw] = useLocalStorageValue(READ_KEY);
  const read = useMemo(() => {
    try {
      return new Set(JSON.parse(readRaw ?? "[]") as string[]);
    } catch {
      return new Set<string>();
    }
  }, [readRaw]);
  // Guarda só os ids mais recentes para o armazenamento não crescer sem limite.
  const saveRead = (ids: Set<string>) => setReadRaw(JSON.stringify([...ids].slice(-200)));
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { notifications: Notification[] };
      setItems(data.notifications);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // Carrega depois que a página já apareceu, para não atrasar a navegação.
    const timer = window.setTimeout(load, 600);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = (items ?? []).filter((item) => !read.has(item.id)).length;

  function markAllRead() {
    const next = new Set(read);
    for (const item of items ?? []) next.add(item.id);
    saveRead(next);
  }

  function markRead(id: string) {
    if (read.has(id)) return;
    const next = new Set(read);
    next.add(id);
    saveRead(next);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={unread ? `Notificações, ${unread} não lidas` : "Notificações"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        className="relative grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:text-ink"
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        {unread ? (
          <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-[18px] text-on-brand shadow-[0_0_0_2px_var(--surface)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <span className="text-[15px] font-bold text-ink">Notificações</span>
            {unread ? (
              <button type="button" onClick={markAllRead} className="text-sm font-medium text-brand-strong hover:underline">
                Marcar todas como lidas
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items === null && !failed ? <p className="m-0 px-4 py-6 text-sm text-ink-muted">Carregando…</p> : null}
            {failed ? <p className="m-0 px-4 py-6 text-sm text-ink-muted">Não conseguimos carregar as notificações. Abra de novo em instantes.</p> : null}
            {items?.length === 0 ? <p className="m-0 px-4 py-6 text-sm text-ink-muted">Nada novo por aqui.</p> : null}
            {items?.map((item) => {
              const Icon = icons[item.kind];
              const isUnread = !read.has(item.id);
              const content = (
                <>
                  <span className={cn("grid size-9 flex-shrink-0 place-items-center rounded-lg", toneClasses[item.tone])}>
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-ink">{item.title}</span>
                    <span className="text-[13px] leading-5 text-ink-muted">{item.body}</span>
                  </span>
                  {isUnread ? <span className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-brand" aria-label="Não lida" /> : null}
                </>
              );
              const rowClass = "flex items-start gap-3 border-b border-border px-4 py-3 text-left no-underline last:border-b-0";
              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    markRead(item.id);
                    setOpen(false);
                  }}
                  className={cn(rowClass, "hover:bg-surface-muted")}
                >
                  {content}
                </Link>
              ) : (
                <div key={item.id} className={rowClass} onMouseEnter={() => markRead(item.id)}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
