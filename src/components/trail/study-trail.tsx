"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Lock, Star } from "lucide-react";
import { OwlMascot, type OwlMood } from "@/components/mascot/owl-mascot";
import { Trophy } from "@/components/trail/trophy";
import { cn } from "@/lib/utils";
import type { Trail, TrailNode, TrailUnit } from "@/lib/study-trail";

/** Curva da trilha: deslocamento horizontal de cada nível, em px. */
const WAVE = [0, 56, 92, 56, 0, -56, -92, 0];
const RING = 2 * Math.PI * 44;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function unitMood(unit: TrailUnit, trail: Trail): OwlMood {
  if (unit.status === "done") return "comemorando";
  if (unit.status === "locked") return "sonolenta";
  if (trail.todayDone || trail.studiedToday) return "cantando";
  return trail.doneCount > 0 && trail.streak === 0 ? "sonolenta" : "atenta";
}

function DayButton({ node, open, onToggle }: { node: TrailNode; open: boolean; onToggle: () => void }) {
  const progress = node.progress && node.progress.target > 0 ? node.progress.value / node.progress.target : 0;
  const Icon = node.status === "done" ? Check : node.status === "locked" ? Lock : Star;

  return (
    <div className="relative grid size-[100px] place-items-center">
      {node.status === "current" ? (
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--track)" strokeWidth="7" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--brand)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${RING * progress} ${RING}`} />
        </svg>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${node.title}${node.status === "done" ? " (concluído)" : node.status === "locked" ? " (bloqueado)" : " (hoje)"}`}
        className={cn(
          "relative grid size-[70px] place-items-center rounded-full transition-transform active:translate-y-[5px] focus-visible:outline-offset-4",
          node.status === "locked"
            ? "bg-track text-ink-muted shadow-[0_6px_0_var(--border-strong)] active:shadow-[0_1px_0_var(--border-strong)]"
            : "bg-brand text-on-brand shadow-[0_6px_0_var(--brand-strong)] active:shadow-[0_1px_0_var(--brand-strong)]",
        )}
      >
        <Icon className="size-7" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span className="pointer-events-none absolute -bottom-1 right-1 grid min-w-7 place-items-center rounded-full border-2 border-bg bg-surface px-1.5 text-xs font-extrabold leading-5 text-ink">
        {node.level}
      </span>
      {node.status === "current" && !open ? (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-border bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.6px] text-brand-strong shadow-card motion-safe:animate-bounce">
          Hoje
          <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border bg-surface" />
        </span>
      ) : null}
    </div>
  );
}

function TrophyButton({ node, tier, open, onToggle }: { node: TrailNode; tier: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${node.title}${node.status === "done" ? " (conquistado)" : " (bloqueado)"}`}
      className="grid place-items-center rounded-2xl p-1 transition-transform hover:-translate-y-0.5 focus-visible:outline-offset-4"
    >
      <Trophy tier={tier} locked={node.status !== "done"} size={88} />
    </button>
  );
}

function NodePopover({ node }: { node: TrailNode }) {
  const current = node.status === "current";
  const trophy = node.kind === "trofeu";
  return (
    <div
      role="dialog"
      aria-label={node.title}
      className={cn(
        "absolute left-1/2 top-[108px] z-20 w-72 -translate-x-1/2 animate-owl-pop rounded-2xl p-4 shadow-pop",
        current ? "bg-brand text-on-brand" : node.status === "done" ? "border border-border bg-surface text-ink" : "border border-border bg-surface-muted text-ink",
      )}
    >
      <p className="m-0 text-[17px] font-bold leading-6">{node.title}</p>
      <p className={cn("m-0 mt-1 text-[13px] leading-5", current ? "text-on-brand/85" : "text-ink-muted")}>
        {node.status === "done" && node.completedAt && !trophy ? `Concluído em ${shortDate(node.completedAt)}. ` : ""}
        {node.hint}
      </p>
      {current && node.progress ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-on-brand/25">
            <div className="h-full rounded-full bg-on-brand" style={{ width: `${Math.min(100, (node.progress.value / node.progress.target) * 100)}%` }} />
          </div>
          <p className="m-0 mt-1.5 text-xs font-medium text-on-brand/85">{node.progress.label}</p>
        </div>
      ) : null}
      {current || (trophy && node.status === "done") ? (
        <Link
          href={node.href}
          className={cn(
            "mt-4 grid h-11 place-items-center rounded-lg text-[15px] font-bold uppercase tracking-[0.4px] no-underline active:translate-y-[3px] active:shadow-none",
            current ? "bg-surface text-brand-strong shadow-[0_4px_0_var(--brand-strong)]" : "bg-brand text-on-brand shadow-[0_4px_0_var(--brand-strong)]",
          )}
        >
          {current ? "Abrir o plano de hoje" : "Ver na sala de troféus"}
        </Link>
      ) : null}
    </div>
  );
}

function SectionBlock({ unit, trail, openId, setOpenId }: { unit: TrailUnit; trail: Trail; openId: string | null; setOpenId: (id: string | null) => void }) {
  const mirror = unit.index % 2 === 1 ? -1 : 1;
  const locked = unit.status === "locked";
  const days = unit.nodes.filter((node) => node.kind === "dia");

  return (
    <section aria-label={`Seção ${unit.section}: ${unit.title}`} className="flex flex-col gap-6">
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-2xl px-5 py-4 shadow-[0_4px_0_var(--unit-shadow)] lg:px-7",
          locked ? "bg-surface-muted text-ink-muted [--unit-shadow:var(--border)]" : "bg-brand text-on-brand [--unit-shadow:var(--brand-strong)]",
        )}
      >
        <div className="min-w-0">
          <p className={cn("m-0 text-[13px] font-bold uppercase tracking-[0.6px]", locked ? "text-ink-muted" : "text-on-brand/80")}>
            Seção {unit.section} · níveis {days[0].level} a {days.at(-1)!.level}
          </p>
          <p className="m-0 mt-0.5 text-xl font-extrabold leading-7">{unit.title}</p>
        </div>
        <span className={cn("flex-none rounded-full px-2.5 py-1 text-xs font-bold", locked ? "bg-surface text-ink-muted" : "bg-on-brand/20")}>
          {days.filter((node) => node.status === "done").length}/{days.length} dias
        </span>
      </div>

      <div className="relative flex flex-col items-center gap-4 py-4">
        <div className={cn("pointer-events-none absolute top-[150px] hidden md:block", mirror === 1 ? "left-[4%]" : "right-[4%]", locked && "opacity-50 grayscale")} aria-hidden="true">
          <OwlMascot mood={unitMood(unit, trail)} size={150} />
        </div>
        {unit.nodes.map((node, index) => {
          const open = openId === node.id;
          return (
            <div
              key={node.id}
              data-current={node.status === "current" ? "" : undefined}
              className={cn("relative", node.status === "current" && "mt-8", open && "z-20")}
              style={{ transform: `translateX(${WAVE[index % WAVE.length] * mirror}px)` }}
            >
              {node.kind === "trofeu" ? (
                <TrophyButton node={node} tier={unit.index} open={open} onToggle={() => setOpenId(open ? null : node.id)} />
              ) : (
                <DayButton node={node} open={open} onToggle={() => setOpenId(open ? null : node.id)} />
              )}
              {open ? <NodePopover node={node} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function StudyTrail({ trail }: { trail: Trail }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha o balão ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!openId) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[role=dialog]") && !target.closest("button[aria-expanded]")) setOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpenId(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  // Abre a página já no nível de hoje.
  useEffect(() => {
    rootRef.current?.querySelector("[data-current]")?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div ref={rootRef} className="flex w-full flex-col gap-10 pb-16">
      {trail.units.map((unit) => (
        <SectionBlock key={unit.index} unit={unit} trail={trail} openId={openId} setOpenId={setOpenId} />
      ))}
    </div>
  );
}
