/**
 * Corujas do pacote "Corujas separadas e animadas" (public/mascote), com o fundo recortado (PNG/WebP com
 * transparência, recorte por IA com BiRefNet em 11/10/2026). Dados sem React, para servir também a
 * componentes de servidor. Cada pose tem a animação CSS do pacote
 * (keyframes owl-* em globals.css), com a mesma duração e o mesmo ponto de giro. As que o pacote deixou paradas
 * (grecia, notebook, feliz, professora, pensando) ficam paradas e só entram com o "pop".
 * Onde cada uma aparece segue o Guia da Coruja: uma cena por tela no máximo.
 */
type OwlSpec = { w: number; h: number; anim?: string; origin?: string };

export const OWLS = {
  /** Pergunta do quiz em aberto. */
  atenta: { w: 201, h: 254, anim: "owl-breathe 3s" },
  /** Inatividade, etapa bloqueada. */
  sonolenta: { w: 260, h: 320, anim: "owl-breathe 4s" },
  /** Dica, tour do produto, resposta marcada sem confirmar. */
  piscando: { w: 422, h: 313, anim: "owl-float 3s", origin: "50% 50%" },
  /** Acertou, cadastro. */
  feliz: { w: 325, h: 340 },
  /** Acerto em sequência, conclusão. */
  comemorando: { w: 307, h: 253, anim: "owl-hop 1.4s" },
  /** Errou, ofensiva, começo de sessão. */
  determinada: { w: 243, h: 241, anim: "owl-wiggle 3.4s" },
  /** Conquista, troféu. */
  apaixonada: { w: 327, h: 252, anim: "owl-heart 1.6s", origin: "50% 50%" },
  /** Fechar o dia, pausa. */
  cantando: { w: 461, h: 313, anim: "owl-sway 3.2s", origin: "50% 10%" },
  /** Plano de estudos, bloco em andamento. */
  estudando: { w: 438, h: 291, anim: "owl-nod 3s" },
  /** Gerando com IA. */
  patinete: { w: 316, h: 382, anim: "owl-scoot 2.4s" },
  /** Trilha, desempenho. */
  grecia: { w: 446, h: 340 },
  /** Planos e pagamento. */
  notebook: { w: 372, h: 310 },
  /** Limite do plano: descansa e volta amanhã. */
  rede: { w: 438, h: 334, anim: "owl-sway 3.6s", origin: "50% 10%" },
  /** Chat com IA. */
  computador: { w: 389, h: 386, anim: "owl-wiggle 2.8s" },
  /** Gabaritou, resultado excelente. */
  festa: { w: 419, h: 341, anim: "owl-hop 1.6s" },
  /** Flashcards, revisão. */
  estudante: { w: 244, h: 328, anim: "owl-bob 2.2s" },
  /** Simulados, explicações. */
  professora: { w: 433, h: 358 },
  /** Nível e progresso. */
  brilhando: { w: 199, h: 291, anim: "owl-pulse 1.8s", origin: "50% 50%" },
  /** Landing e telas de boas-vindas (imagem larga). */
  educacao: { w: 720, h: 374, anim: "owl-bob 2.6s", origin: "50% 50%" },
  /** Anotações, erro do sistema. */
  pensando: { w: 463, h: 480 },
  /** Herói de capa: voando ao lado de chamadas (landing, conquistas, oferta do plano). */
  heroi: { w: 583, h: 522, anim: "owl-float 3.4s", origin: "50% 50%" },
  /** Questão "ultrassecreta" (preferida dos examinadores) e provas anteriores. */
  detetive: { w: 459, h: 720, anim: "owl-breathe 3.6s" },
  /** Brasil: vestibulares e ENEM, comemorações nacionais. */
  brasil: { w: 485, h: 720, anim: "owl-bob 2.2s" },
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
