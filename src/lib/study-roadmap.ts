/**
 * Roteiro de um bloco do plano de estudos: divide o tempo planejado em etapas, quase todas sem IA,
 * para o bloco render o tempo inteiro (um quiz leva minutos; o bloco pode ter uma hora).
 * Segue as técnicas de maior evidência (Dunlosky et al., 2013): testar-se, revisar espaçado e explicar com
 * as próprias palavras. Nenhuma etapa gasta IA, exceto a prática quando ela é um quiz gerado.
 */

export type RoadmapStep = {
  title: string;
  detail: string;
  minutes: number;
  /** Link interno do app ou externo (busca no YouTube). */
  href?: string;
  external?: boolean;
};

type Part = { share: number; title: string; detail: string; href?: (ctx: Ctx) => string | undefined; external?: boolean };
type Ctx = { subject: string; topic: string; practiceHref?: string };

function youtubeSearch(ctx: Ctx) {
  const query = `aula ${ctx.topic || ctx.subject} ${ctx.topic ? ctx.subject : ""}`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

const PLANS: Record<string, Part[]> = {
  estudo: [
    { share: 0.1, title: "Aquecer com a revisão", detail: "Responda os cartões e as questões que voltaram hoje. Tente lembrar antes de virar.", href: () => "/dashboard/revisao" },
    { share: 0.4, title: "Aprender o conteúdo", detail: "Assista uma aula sobre o assunto ou leia seu material. Pause e anote as ideias principais com suas palavras.", href: youtubeSearch, external: true },
    { share: 0.35, title: "Praticar com questões", detail: "Resolva as questões sem consultar. Errou? Leia a explicação antes de seguir.", href: (ctx) => ctx.practiceHref },
    { share: 0.15, title: "Fechar explicando", detail: "Sem olhar nada, explique o assunto em 3 ou 4 frases, como se ensinasse alguém. O que travar, revise ou pergunte no chat.", href: () => "/dashboard/chat" },
  ],
  revisao: [
    { share: 0.5, title: "Revisar os cartões", detail: "Tente lembrar cada resposta antes de virar o cartão e seja honesto na nota.", href: (ctx) => ctx.practiceHref },
    { share: 0.3, title: "Refazer o que errou", detail: "Volte às questões que você errou e resolva de novo, sem olhar a resolução.", href: () => "/dashboard/revisao" },
    { share: 0.2, title: "Resumo de memória", detail: "Escreva num papel tudo o que lembra do assunto. Depois confira o que faltou." },
  ],
  simulado: [
    { share: 0.05, title: "Preparar o ambiente", detail: "Celular longe, água, papel para rascunho. Trate como o dia da prova." },
    { share: 0.8, title: "Fazer o simulado", detail: "No ritmo da prova: pule a questão difícil e volte depois.", href: (ctx) => ctx.practiceHref },
    { share: 0.15, title: "Analisar os erros", detail: "Para cada erro, anote o motivo: falta de conteúdo, distração ou interpretação.", href: () => "/dashboard/revisao" },
  ],
  redacao: [
    { share: 0.15, title: "Planejar", detail: "Leia o tema, defina sua tese e os dois argumentos, e pense numa proposta de intervenção completa." },
    { share: 0.6, title: "Escrever", detail: "Escreva a redação inteira, à mão ou digitada, sem pausar para corrigir.", href: (ctx) => ctx.practiceHref },
    { share: 0.25, title: "Revisar pela correção", detail: "Leia o comentário de cada competência e reescreva o parágrafo mais fraco." },
  ],
};

/** Etapas do bloco com os minutos de cada uma (somam o tempo planejado). */
export function buildRoadmap(input: { type: string; subject: string; topic: string; plannedMinutes: number; practiceHref?: string }): RoadmapStep[] {
  const parts = PLANS[input.type] ?? PLANS.estudo;
  const total = Math.max(5, Math.round(input.plannedMinutes));
  const ctx: Ctx = { subject: input.subject, topic: input.topic, practiceHref: input.practiceHref };
  const minutes = parts.map((part) => Math.max(1, Math.round(total * part.share)));
  // Ajusta o arredondamento na etapa maior, para a soma bater com o bloco.
  const diff = total - minutes.reduce((sum, value) => sum + value, 0);
  const biggest = minutes.indexOf(Math.max(...minutes));
  minutes[biggest] = Math.max(1, minutes[biggest] + diff);
  return parts.map((part, index) => ({
    title: part.title,
    detail: part.detail,
    minutes: minutes[index],
    href: part.href?.(ctx),
    external: part.external,
  }));
}
