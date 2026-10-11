/**
 * Corujas do pacote "Corujas separadas e animadas" (public/mascote). Dados sem React, para servir também a
 * componentes de servidor. Cada pose tem a animação CSS do pacote
 * (keyframes owl-* em globals.css), com a mesma duração e o mesmo ponto de giro. As que o pacote deixou paradas
 * (grecia, notebook, feliz, professora, pensando) ficam paradas e só entram com o "pop".
 * Onde cada uma aparece segue o Guia da Coruja: uma cena por tela no máximo.
 */
type OwlSpec = { w: number; h: number; anim?: string; origin?: string };

export const OWLS = {
  /** Pergunta do quiz em aberto. */
  atenta: { w: 260, h: 284, anim: "owl-breathe 3s" },
  /** Inatividade, etapa bloqueada. */
  sonolenta: { w: 486, h: 400, anim: "owl-breathe 4s" },
  /** Dica, tour do produto, resposta marcada sem confirmar. */
  piscando: { w: 492, h: 410, anim: "owl-float 3s", origin: "50% 50%" },
  /** Acertou, cadastro. */
  feliz: { w: 486, h: 410 },
  /** Acerto em sequência, conclusão. */
  comemorando: { w: 360, h: 284, anim: "owl-hop 1.4s" },
  /** Errou, ofensiva, começo de sessão. */
  determinada: { w: 300, h: 284, anim: "owl-wiggle 3.4s" },
  /** Conquista, troféu. */
  apaixonada: { w: 380, h: 284, anim: "owl-heart 1.6s", origin: "50% 50%" },
  /** Fechar o dia, pausa. */
  cantando: { w: 492, h: 410, anim: "owl-sway 3.2s", origin: "50% 10%" },
  /** Plano de estudos, bloco em andamento. */
  estudando: { w: 484, h: 410, anim: "owl-nod 3s" },
  /** Gerando com IA. */
  patinete: { w: 488, h: 410, anim: "owl-scoot 2.4s" },
  /** Trilha, desempenho. */
  grecia: { w: 492, h: 410 },
  /** Planos e pagamento. */
  notebook: { w: 486, h: 410 },
  /** Limite do plano: descansa e volta amanhã. */
  rede: { w: 484, h: 410, anim: "owl-sway 3.6s", origin: "50% 10%" },
  /** Chat com IA. */
  computador: { w: 488, h: 410, anim: "owl-wiggle 2.8s" },
  /** Gabaritou, resultado excelente. */
  festa: { w: 492, h: 414, anim: "owl-hop 1.6s" },
  /** Flashcards, revisão. */
  estudante: { w: 484, h: 400, anim: "owl-bob 2.2s" },
  /** Simulados, explicações. */
  professora: { w: 488, h: 400 },
  /** Nível e progresso. */
  brilhando: { w: 492, h: 400, anim: "owl-pulse 1.8s", origin: "50% 50%" },
  /** Landing e telas de boas-vindas (imagem larga). */
  educacao: { w: 1008, h: 470, anim: "owl-bob 2.6s", origin: "50% 50%" },
  /** Anotações, erro do sistema. */
  pensando: { w: 696, h: 480 },
} satisfies Record<string, OwlSpec>;

export type OwlMood = keyof typeof OWLS;

export function owlSrc(mood: OwlMood) {
  return `/mascote/coruja-${mood}.webp`;
}

/** Estilo da animação do pacote para a pose (vazio nas poses paradas). */
export function owlAnimationStyle(mood: OwlMood): { animation?: string; transformOrigin?: string } {
  const owl: OwlSpec = OWLS[mood];
  return owl.anim ? { animation: `${owl.anim} ease-in-out infinite`, transformOrigin: owl.origin ?? "50% 100%" } : {};
}
