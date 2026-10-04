"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Check, ClipboardCheck, Flame, Layers, Lock, PenTool, Target, Trophy, type LucideIcon } from "lucide-react";
import { OwlMascot, type OwlMood } from "@/components/mascot/owl-mascot";
import { cn } from "@/lib/utils";
import type { Trail, TrailNode, TrailNodeKind, TrailUnit } from "@/lib/study-trail";

const icons: Record<TrailNodeKind, LucideIcon> = {
  estudo: BookOpen,
  quiz: Target,
  flashcards: Layers,
  ofensiva: Flame,
  simulado: ClipboardCheck,
  redacao: PenTool,
  trofeu: Trophy,
};

/** Curva da trilha: deslocamento horizontal de cada etapa, em px. */
const WAVE = [0, 52, 84, 52, 0, -52, -84, -52];
const RING = 2 * Math.PI * 44;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function unitMood(unit: TrailUnit, trail: Trail): OwlMood {
  if (unit.status === "done") return "comemorando";
  if (unit.status === "locked") return "sonolenta";
  if (trail.studiedToday) return "cantando";
  return trail.doneCount > 0 && trail.streak === 0 ? "sonolenta" : "atenta";
}

function NodeButton({ node, open, onToggle }: { node: TrailNode; open: boolean; onToggle: () => void }) {
  const Icon = node.status === "locked" && node.kind !== "trofeu" ? Lock : node.status === "done" && node.kind !== "trofeu" ? Check : icons[node.kind];
  const trophy = node.kind === "trofeu";
  const progress = node.progress && node.progress.target > 0 ? node.progress.value / node.progress.target : 0;

  return (
    <div className="relative grid size-[100px] place-items-center">
      {node.status === "current" ? (
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--track)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="var(--brand)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${RING * progress} ${RING}`}
          />
        </svg>
      ) : null}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${node.title}${node.status === "done" ? " (concluída)" : node.status === "locked" ? " (bloqueada)" : " (etapa atual)"}`}
        className={cn(
          "relative grid size-[70px] place-items-center rounded-full transition-transform active:translate-y-[5px] focus-visible:outline-offset-4",
          node.status === "locked"
            ? "bg-track text-ink-muted shadow-[0_6px_0_var(--border-strong)] active:shadow-[0_1px_0_var(--border-strong)]"
            : trophy
              ? "bg-[#F5B400] text-white shadow-[0_6px_0_#C68A00] active:shadow-[0_1px_0_#C68A00]"
              : "bg-brand text-on-brand shadow-[0_6px_0_var(--brand-strong)] active:shadow-[0_1px_0_var(--brand-strong)]",
        )}
      >
        <Icon className="size-7" strokeWidth={2.5} aria-hidden="true" />
      </button>
      {node.status === "current" && !open ? (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-border bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.6px] text-brand-strong shadow-card motion-safe:animate-bounce">
          {node.completedAt === null && node.progress?.value ? "Continuar" : "Começar"}
          <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-border bg-surface" />
        </span>
      ) : null}
    </div>
  );
}

function NodePopover({ node }: { node: TrailNode }) {
  const current = node.status === "current";
  return (
    <div
      role="dialog"
      aria-label={node.title}
      className={cn(
        "absolute left-1/2 top-[104px] z-20 w-72 -translate-x-1/2 animate-owl-pop rounded-2xl p-4 shadow-pop",
        current ? "bg-brand text-on-brand" : node.status === "done" ? "border border-border bg-surface text-ink" : "border border-border bg-surface-muted text-ink",
      )}
    >
      <p className="m-0 text-[17px] font-bold leading-6">{node.title}</p>
      <p className={cn("m-0 mt-1 text-[13px] leading-5", current ? "text-on-brand/85" : "text-ink-muted")}>
        {node.status === "locked" ? "Conclua as etapas anteriores para liberar esta." : node.status === "done" ? `Concluída${node.completedAt ? ` em ${shortDate(node.completedAt)}` : ""}.` : node.hint}
      </p>
      {current && node.progress ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-on-brand/25">
            <div className="h-full rounded-full bg-on-brand" style={{ width: `${Math.min(100, (node.progress.value / node.progress.target) * 100)}%` }} />
          </div>
          <p className="m-0 mt-1.5 text-xs font-medium text-on-brand/85">{node.progress.label}</p>
        </div>
      ) : null}
      {current && node.kind !== "trofeu" ? (
        <Link
          href={node.href}
          className="mt-4 grid h-11 place-items-center rounded-lg bg-surface text-[15px] font-bold uppercase tracking-[0.4px] text-brand-strong no-underline shadow-[0_4px_0_var(--brand-strong)] active:translate-y-[3px] active:shadow-none"
        >
          Começar
        </Link>
      ) : null}
    </div>
  );
}

function UnitBlock({ unit, trail, openId, setOpenId }: { unit: TrailUnit; trail: Trail; openId: string | null; setOpenId: (id: string | null) => void }) {
  const mirror = unit.index % 2 === 1 ? -1 : 1;
  const locked = unit.status === "locked";

  return (
    <section aria-label={`Unidade ${unit.index + 1}: ${unit.title}`} className="flex flex-col gap-6">
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-2xl px-5 py-4 shadow-[0_4px_0_var(--unit-shadow)]",
          locked ? "bg-surface-muted text-ink-muted [--unit-shadow:var(--border)]" : "bg-brand text-on-brand [--unit-shadow:var(--brand-strong)]",
        )}
      >
        <div className="min-w-0">
          <p className={cn("m-0 text-[13px] font-bold uppercase tracking-[0.6px]", locked ? "text-ink-muted" : "text-on-brand/80")}>
            Seção {unit.section}, unidade {unit.index + 1}
          </p>
          <p className="m-0 mt-0.5 text-xl font-extrabold leading-7">{unit.title}</p>
        </div>
        <span className={cn("flex-none rounded-full px-2.5 py-1 text-xs font-bold", locked ? "bg-surface text-ink-muted" : "bg-on-brand/20")}>
          {unit.nodes.filter((node) => node.status === "done").length}/{unit.nodes.length}
        </span>
      </div>

      <div className="relative flex flex-col items-center gap-4 py-4">
        <div
          className={cn("pointer-events-none absolute top-[150px] hidden sm:block", mirror === 1 ? "left-[2%]" : "right-[2%]", locked && "opacity-50 grayscale")}
          aria-hidden="true"
        >
          <OwlMascot mood={unitMood(unit, trail)} size={150} />
        </div>
        {unit.nodes.map((node, index) => {
          const open = openId === node.id;
          return (
            <div key={node.id} className={cn("relative", node.status === "current" && "mt-8", open && "z-20")} style={{ transform: `translateX(${WAVE[index % WAVE.length] * mirror}px)` }}>
              <NodeButton node={node} open={open} onToggle={() => setOpenId(open ? null : node.id)} />
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

  // Abre a página já na etapa atual.
  useEffect(() => {
    rootRef.current?.querySelector("[data-current]")?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div ref={rootRef} className="mx-auto flex w-full max-w-[640px] flex-col gap-10 pb-16">
      {trail.units.map((unit) => (
        <div key={unit.index} data-current={unit.status === "current" ? "" : undefined}>
          <UnitBlock unit={unit} trail={trail} openId={openId} setOpenId={setOpenId} />
        </div>
      ))}
    </div>
  );
}
