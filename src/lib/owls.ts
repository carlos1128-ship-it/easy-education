/**
 * Corujas do pacote "Corujas separadas e animadas" (public/mascote), com o fundo recortado (PNG/WebP com
 * transparência, recorte por IA com BiRefNet em 11/10/2026). Dados sem React, para servir também a
 * componentes de servidor. Cada pose tem a animação CSS do pacote
 * (keyframes owl-* em globals.css), com a mesma duração e o mesmo ponto de giro. As que o pacote deixou paradas
 * (grecia, notebook, feliz, professora, pensando) ficam paradas e só entram com o "pop".
 * Onde cada uma aparece segue o Guia da Coruja: uma cena por tela no máximo.
 */
type OwlSpec = { w: number; h: number; src?: string; anim?: string; origin?: string };

export const OWLS = {
  /** Pergunta do quiz em aberto. */
  atenta: { w: 1265, h: 1244, src: "/mascote/coruja-v2-estudiosa.webp", anim: "owl-breathe 3s" },
  /** Inatividade, etapa bloqueada. */
  sonolenta: { w: 1254, h: 1254, src: "/mascote/coruja-v2-sonolenta.webp", anim: "owl-breathe 4s" },
  /** Dica, tour do produto, resposta marcada sem confirmar. */
  piscando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-empolgada.webp", anim: "owl-float 3s", origin: "50% 50%" },
  /** Acertou, cadastro. */
  feliz: { w: 1254, h: 1254, src: "/mascote/coruja-v2-joinha.webp" },
  /** Acerto em sequência, conclusão. */
  comemorando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-comemorando.webp", anim: "owl-hop 1.4s" },
  /** Errou, ofensiva, começo de sessão. */
  determinada: { w: 1254, h: 1254, src: "/mascote/coruja-v2-determinada.webp", anim: "owl-wiggle 3.4s" },
  /** Conquista, troféu. */
  apaixonada: { w: 1254, h: 1254, src: "/mascote/coruja-v2-apaixonada.webp", anim: "owl-heart 1.6s", origin: "50% 50%" },
  /** Fechar o dia, pausa. */
  cantando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-rede.webp", anim: "owl-sway 3.2s", origin: "50% 10%" },
  /** Plano de estudos, bloco em andamento. */
  estudando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-livros.webp", anim: "owl-nod 3s" },
  /** Gerando com IA. */
  patinete: { w: 1254, h: 1254, src: "/mascote/coruja-v2-patinete.webp", anim: "owl-scoot 2.4s" },
  /** Trilha, desempenho. */
  grecia: { w: 1254, h: 1254, src: "/mascote/coruja-v2-grecia.webp" },
  /** Planos e pagamento. */
  notebook: { w: 1254, h: 1254, src: "/mascote/coruja-v2-notebook.webp" },
  /** Limite do plano: descansa e volta amanhã. */
  rede: { w: 1254, h: 1254, src: "/mascote/coruja-v2-rede.webp", anim: "owl-sway 3.6s", origin: "50% 10%" },
  /** Chat com IA. */
  computador: { w: 1254, h: 1254, src: "/mascote/coruja-v2-computador.webp", anim: "owl-wiggle 2.8s" },
  /** Gabaritou, resultado excelente. */
  festa: { w: 1254, h: 1254, src: "/mascote/coruja-v2-escolar.webp", anim: "owl-hop 1.6s" },
  /** Provas anteriores e personalização do conteúdo. */
  escolar: { w: 1254, h: 1254, src: "/mascote/coruja-v2-escolar.webp", anim: "owl-bob 2.6s", origin: "50% 50%" },
  /** Flashcards, revisão. */
  estudante: { w: 1254, h: 1254, src: "/mascote/coruja-v2-livros.webp", anim: "owl-bob 2.2s" },
  /** Simulados, explicações. */
  professora: { w: 1254, h: 1254, src: "/mascote/coruja-v2-professora.webp" },
  /** Nível e progresso. */
  brilhando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-fisica.webp", anim: "owl-pulse 1.8s", origin: "50% 50%" },
  /** Landing e telas de boas-vindas (imagem larga). */
  educacao: { w: 1254, h: 1254, src: "/mascote/coruja-v2-notebook-estudando.webp", anim: "owl-bob 2.6s", origin: "50% 50%" },
  /** Anotações, erro do sistema. */
  pensando: { w: 1254, h: 1254, src: "/mascote/coruja-v2-pensando.webp" },
  /** Herói de capa: voando ao lado de chamadas (landing, conquistas, oferta do plano). */
  heroi: { w: 1254, h: 1254, src: "/mascote/coruja-v2-voando.webp", anim: "owl-float 3.4s", origin: "50% 50%" },
  /** Questão "ultrassecreta" (preferida dos examinadores) e provas anteriores. */
  detetive: { w: 1254, h: 1254, src: "/mascote/coruja-v2-historia.webp", anim: "owl-breathe 3.6s" },
  /** Brasil: vestibulares e ENEM, comemorações nacionais. */
  brasil: { w: 1254, h: 1254, src: "/mascote/coruja-v2-grecia.webp", anim: "owl-bob 2.2s" },
  /** Corujas específicas de matéria usadas em quizzes e simulados. */
  quimica: { w: 1254, h: 1254, src: "/mascote/coruja-v2-quimica.webp", anim: "owl-breathe 3s" },
  fisica: { w: 1254, h: 1254, src: "/mascote/coruja-v2-fisica.webp", anim: "owl-breathe 3s" },
  biologia: { w: 1254, h: 1254, src: "/mascote/coruja-v2-biologia.webp", anim: "owl-breathe 3s" },
  historia: { w: 1254, h: 1254, src: "/mascote/coruja-v2-historia.webp", anim: "owl-breathe 3s" },
  matematica: { w: 1254, h: 1254, src: "/mascote/coruja-v2-matematica.webp", anim: "owl-breathe 3s" },
} satisfies Record<string, OwlSpec>;

export type OwlMood = keyof typeof OWLS;

export function owlSrc(mood: OwlMood) {
  return OWLS[mood].src ?? `/mascote/coruja-v2-${mood}.webp`;
}

/** Estilo da animação do pacote para a pose (vazio nas poses paradas). */
export function owlAnimationStyle(mood: OwlMood): { animation?: string; transformOrigin?: string } {
  const owl: OwlSpec = OWLS[mood];
  return owl.anim ? { animation: `${owl.anim} ease-in-out infinite`, transformOrigin: owl.origin ?? "50% 100%" } : {};
}
