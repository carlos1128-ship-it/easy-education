/**
 * Roteiro de um bloco do plano de estudos: divide o tempo planejado em etapas, quase todas sem IA,
 * para o bloco render o tempo inteiro (um quiz leva minutos; o bloco pode ter uma hora).
 * Segue as técnicas de maior evidência (Dunlosky et al., 2013): testar-se, revisar espaçado e explicar com
 * as próprias palavras. Nenhuma etapa gasta IA, exceto a prática quando ela é um quiz gerado.
 */

/**
 * O que marca a etapa como feita, sempre por um evento real (nunca por clique):
 * - time: os minutos estudados no bloco chegaram ao fim desta etapa;
 * - activity: a atividade do bloco terminou (quiz/simulado respondido, deck revisado, redação enviada);
 * - review: o aluno revisou cartões ou questões depois de começar o bloco (ou não havia nada vencido);
 * - note: o aluno escreveu uma anotação no bloco (ou a atividade terminou e os minutos da etapa passaram).
 */
export type StepCheck = "time" | "activity" | "review" | "note";

export type RoadmapStep = {
  title: string;
  detail: string;
  minutes: number;
  /** Link interno do app ou externo (busca no YouTube). */
  href?: string;
  external?: boolean;
  check: StepCheck;
};

type Part = { share: number; title: string; detail: string; check: StepCheck; href?: (ctx: Ctx) => string | undefined; external?: boolean };
type Ctx = { subject: string; topic: string; practiceHref?: string };

function youtubeSearch(ctx: Ctx) {
  const query = `aula ${ctx.topic || ctx.subject} ${ctx.topic ? ctx.subject : ""}`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

const PLANS: Record<string, Part[]> = {
  estudo: [
    { share: 0.1, check: "review", title: "Aquecer com a revisão", detail: "Responda os cartões e as questões que voltaram hoje. Tente lembrar antes de virar.", href: () => "/dashboard/revisao" },
    { share: 0.4, check: "time", title: "Aprender o conteúdo", detail: "Assista uma aula sobre o assunto ou leia seu material. Pause e anote as ideias principais com suas palavras.", href: youtubeSearch, external: true },
    { share: 0.35, check: "activity", title: "Praticar com questões", detail: "Resolva as questões sem consultar. Errou? Leia a explicação antes de seguir.", href: (ctx) => ctx.practiceHref },
    { share: 0.15, check: "note", title: "Fechar explicando", detail: "Sem olhar nada, explique o assunto em 3 ou 4 frases, como se ensinasse alguém. Escreva numa anotação do bloco. O que travar, revise ou pergunte no chat.", href: () => "/dashboard/chat" },
  ],
  revisao: [
    { share: 0.5, check: "activity", title: "Revisar os cartões", detail: "Tente lembrar cada resposta antes de virar o cartão e seja honesto na nota.", href: (ctx) => ctx.practiceHref },
    { share: 0.3, check: "review", title: "Refazer o que errou", detail: "Volte às questões que você errou e resolva de novo, sem olhar a resolução.", href: () => "/dashboard/revisao" },
    { share: 0.2, check: "note", title: "Resumo de memória", detail: "Escreva numa anotação do bloco tudo o que lembra do assunto. Depois confira o que faltou." },
  ],
  simulado: [
    { share: 0.05, check: "time", title: "Preparar o ambiente", detail: "Celular longe, água, papel para rascunho. Trate como o dia da prova." },
    { share: 0.8, check: "activity", title: "Fazer o simulado", detail: "No ritmo da prova: pule a questão difícil e volte depois.", href: (ctx) => ctx.practiceHref },
    { share: 0.15, check: "note", title: "Analisar os erros", detail: "Para cada erro, anote o motivo numa anotação do bloco: falta de conteúdo, distração ou interpretação.", href: () => "/dashboard/revisao" },
  ],
  redacao: [
    { share: 0.15, check: "time", title: "Planejar", detail: "Leia o tema, defina sua tese e os dois argumentos, e pense numa proposta de intervenção completa." },
    { share: 0.6, check: "activity", title: "Escrever", detail: "Escreva a redação inteira, à mão ou digitada, sem pausar para corrigir.", href: (ctx) => ctx.practiceHref },
    { share: 0.25, check: "note", title: "Revisar pela correção", detail: "Leia o comentário de cada competência e reescreva o parágrafo mais fraco." },
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
    check: part.check,
  }));
}

/** Eventos reais do bloco, lidos do banco (ver getRunProgress em study-runs.ts). */
export type RoadmapEvents = {
  /** Minutos estudados no bloco (registrados + o trecho do cronômetro em andamento). */
  minutes: number;
  activityDone: boolean;
  /** Cartões ou questões revisados depois do início do bloco. */
  reviewsDone: number;
  /** Cartões e questões vencidos agora (0 = nada para revisar). */
  reviewsDue: number;
  /** O aluno escreveu uma anotação neste bloco. */
  noteWritten: boolean;
  /** Bloco já concluído: todas as etapas ficam feitas. */
  completed?: boolean;
};

/** Índices marcados pelo aluno, lidos do banco (JSON). Ignora o que não for índice válido. */
export function parseManualChecks(value: unknown, stepCount: number): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is number => Number.isInteger(item) && item >= 0 && item < stepCount))].sort((a, b) => a - b);
}

/** Liga ou desliga uma etapa na lista do aluno. */
export function toggleManualCheck(current: number[], step: number) {
  return current.includes(step) ? current.filter((item) => item !== step) : [...current, step].sort((a, b) => a - b);
}

/** Quais etapas estão feitas (mesma ordem de `steps`). Etapa de tempo vale quando os minutos chegam ao fim dela. */
export function roadmapChecks(steps: RoadmapStep[], events: RoadmapEvents): boolean[] {
  let elapsedUntil = 0;
  return steps.map((step) => {
    elapsedUntil += step.minutes;
    if (events.completed) return true;
    const timeReached = events.minutes >= elapsedUntil;
    switch (step.check) {
      case "activity":
        return events.activityDone;
      case "review":
        return events.reviewsDone > 0 || events.reviewsDue === 0 || timeReached;
      case "note":
        return events.noteWritten || (timeReached && events.activityDone);
      default:
        return timeReached;
    }
  });
}
