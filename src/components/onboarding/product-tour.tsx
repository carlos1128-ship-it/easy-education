"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OwlMascot, type OwlMood } from "@/components/mascot/owl-mascot";
import { cn } from "@/lib/utils";

/** Evento para abrir o tutorial de qualquer lugar (botão "?" do topo, Configurações). */
export const START_TOUR_EVENT = "easy:start-tour";

export function startProductTour() {
  window.dispatchEvent(new Event(START_TOUR_EVENT));
}

type TourStep = {
  /** Valor do atributo data-tour do elemento destacado. Sem alvo (ou alvo escondido), o cartão aparece no centro. */
  target?: string;
  title: string;
  text: string;
  owl?: OwlMood;
};

const STEPS: TourStep[] = [
  { title: "Bem-vindo ao Easy Education!", text: "Em um minuto eu mostro para que serve cada parte do app. Pode pular quando quiser.", owl: "feliz" },
  { target: "/dashboard", title: "Início", text: "Seu painel do dia: o plano de hoje, a trilha, as próximas revisões e o seu desempenho." },
  { target: "/dashboard/trilha", title: "Trilha", text: "Cada dia de estudo concluído vira um nível. A cada 7 dias você ganha um troféu." },
  { target: "/dashboard/chat", title: "Chat com IA", text: "Tire dúvidas, mande a foto de um exercício ou peça \"monta um simulado de matemática\". A IA cria e te leva até ele." },
  { target: "/dashboard/banco", title: "Banco de questões", text: "Questões de provas anteriores com gabarito e resolução comentada, sem baixar nada. Filtre por ano, matéria e assunto. Funciona em todos os planos." },
  { target: "/dashboard/arquivos", title: "Arquivos", text: "Envie um PDF, a foto do caderno ou o link de uma aula do YouTube. Tudo vira quiz, flashcards e simulado." },
  { target: "/dashboard/quizzes", title: "Quizzes", text: "Estudo rápido: de 5 a 20 questões com explicação em cada uma. Ótimo para testar o que você estudou hoje." },
  { target: "/dashboard/flashcards", title: "Flashcards", text: "Para memorizar: pergunta na frente, resposta atrás. O app decide quando cada cartão volta, pouco antes de você esquecer." },
  { target: "/dashboard/plano", title: "Plano de estudo", text: "Sua semana organizada. Clique em Iniciar num bloco: o cronômetro liga e a atividade já abre pronta." },
  { target: "/dashboard/redacao", title: "Redação", text: "Digite ou fotografe sua redação. A nota sai de 0 a 1000 pela grade do Enem, com o que melhorar em cada competência." },
  { target: "/dashboard/simulados", title: "Simulados", text: "Treino no ritmo de prova, com várias matérias juntas. Os simulados de provas anteriores ficam no banco de questões e mostram uma estimativa baseada no seu desempenho." },
  { target: "/dashboard/desempenho", title: "Desempenho", text: "Veja sua evolução por matéria e onde você mais erra, para saber o que revisar." },
  { target: "notificacoes", title: "Avisos", text: "Ofensiva, meta do dia e flashcards para revisar aparecem aqui." },
  { target: "/dashboard/configuracoes", title: "Configurações", text: "Mude sua personalização quando quiser: a IA se adapta ao que você está estudando." },
  { title: "Tudo pronto!", text: "Comece pelo plano de hoje. Para ver este tutorial de novo, use “Tutorial do app” no menu (no computador, também no ? do topo).", owl: "comemorando" },
];

type Rect = { top: number; left: number; width: number; height: number };
const CARD_WIDTH = 320;
const GAP = 14;
const PAD = 6;

/** Primeiro elemento visível com o data-tour pedido (o menu lateral some no celular; a barra de baixo aparece). */
function findTarget(target?: string): Rect | null {
  if (!target) return null;
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
      return { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 };
    }
  }
  return null;
}

type Placement = "right" | "left" | "top" | "bottom" | "center";

function placeCard(rect: Rect | null): { placement: Placement; top: number; left: number; arrow: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - 32);
  if (!rect) return { placement: "center", top: vh / 2, left: vw / 2, arrow: 0 };
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const clampX = (x: number) => Math.max(16, Math.min(vw - width - 16, x));
  const clampY = (y: number) => Math.max(16, Math.min(vh - 220, y));
  // Seta sempre apontando para o centro do alvo, mesmo com o cartão encostado na borda.
  const horizontal = (placement: "top" | "bottom", top: number) => {
    const left = clampX(centerX - width / 2);
    return { placement, top, left, arrow: Math.max(18, Math.min(width - 18, centerX - left)) };
  };
  const vertical = (placement: "left" | "right", left: number) => {
    const top = clampY(centerY - 60);
    return { placement, top, left, arrow: Math.max(18, Math.min(150, centerY - top)) };
  };
  // Barra de baixo do celular: cartão acima.
  if (rect.top > vh * 0.7) return horizontal("top", rect.top - GAP);
  // Menu lateral: cartão à direita.
  if (rect.left < vw * 0.4 && rect.left + rect.width + GAP + width < vw - 8) return vertical("right", rect.left + rect.width + GAP);
  // Topo da tela (sino, avatar): cartão abaixo.
  if (rect.top < vh * 0.25) return horizontal("bottom", rect.top + rect.height + GAP);
  if (rect.left > vw * 0.6 && rect.left - GAP - width > 8) return vertical("left", rect.left - GAP - width);
  return rect.top > vh * 0.5 ? horizontal("top", rect.top - GAP) : horizontal("bottom", rect.top + rect.height + GAP);
}

/**
 * Tutorial guiado da primeira vez: destaca cada área do menu com uma seta e explica para que serve.
 * Abre sozinho no início para quem ainda não viu; depois, pelo botão "?" do topo.
 */
export function ProductTour({ autoStart }: { autoStart: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [, forceLayout] = useState(0);
  const step = STEPS[index];

  const markDone = useCallback(() => {
    fetch("/api/tour", { method: "POST" }).catch(() => undefined);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    markDone();
  }, [markDone]);

  // Primeira vez: abre sozinho na página inicial, depois que a tela carregou.
  useEffect(() => {
    if (!autoStart || pathname !== "/dashboard") return;
    const timer = window.setTimeout(() => {
      setIndex(0);
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autoStart, pathname]);

  useEffect(() => {
    const start = () => {
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      setRect(findTarget(step.target));
      forceLayout((n) => n + 1);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setIndex((value) => Math.min(STEPS.length - 1, value + 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || typeof window === "undefined") return null;

  const { placement, top, left, arrow } = placeCard(rect);
  const last = index === STEPS.length - 1;
  const width = Math.min(CARD_WIDTH, window.innerWidth - 32);

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Fundo escuro com um "furo" no item destacado. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            // Contorno azul com brilho (aparece nos dois temas) + o resto da tela escurecido.
            boxShadow:
              "0 0 0 3px var(--color-brand), 0 0 22px 6px color-mix(in srgb, var(--color-brand) 60%, transparent), 0 0 0 9999px rgba(0, 0, 0, 0.66)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/65" />
      )}
      <div className="fixed inset-0" onClick={(event) => event.stopPropagation()} />

      <div
        className={cn(
          "fixed rounded-2xl border border-border bg-surface p-4 text-ink shadow-pop transition-all duration-300",
          placement === "center" && "-translate-x-1/2 -translate-y-1/2",
          placement === "top" && "-translate-y-full",
        )}
        style={{ top, left, width }}
      >
        {placement !== "center" ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute size-3.5 rotate-45 border-border bg-surface",
              placement === "right" && "-left-[8px] -mt-[7px] border-b border-l",
              placement === "left" && "-right-[8px] -mt-[7px] border-r border-t",
              placement === "bottom" && "-top-[8px] -ml-[7px] border-l border-t",
              placement === "top" && "-bottom-[8px] -ml-[7px] border-b border-r",
            )}
            style={placement === "left" || placement === "right" ? { top: arrow } : { left: arrow }}
          />
        ) : null}
        <div className="flex items-start gap-3">
          {step.owl ? <OwlMascot mood={step.owl} size={64} /> : null}
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-medium text-ink-muted">
              {index + 1} de {STEPS.length}
            </p>
            <h2 id="tour-title" className="m-0 mt-0.5 text-base font-bold text-ink">
              {step.title}
            </h2>
            <p className="m-0 mt-1.5 text-sm leading-5 text-ink-muted">{step.text}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={close} className="text-sm font-medium text-ink-muted hover:text-ink">
            {last ? "Fechar" : "Pular"}
          </button>
          <div className="flex gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((value) => value - 1)}
                className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-surface-muted"
              >
                Voltar
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => (last ? close() : setIndex((value) => value + 1))}
              className="h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-strong"
              autoFocus
            >
              {index === 0 ? "Começar" : last ? "Vamos estudar" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
