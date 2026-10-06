import { Type, type Schema } from "@google/genai";
import type { EssayFeedback } from "@/types";

/**
 * Grade oficial de correção da redação do Enem (INEP, "A Redação do Enem — Cartilha do Participante").
 * Cada competência vale de 0 a 200, só nos níveis 0, 40, 80, 120, 160 e 200; a nota total é a soma.
 */
export const ENEM_LEVELS = [0, 40, 80, 120, 160, 200] as const;

export const ENEM_COMPETENCIES = [
  {
    key: "normasCultas",
    id: "C1",
    name: "Domínio da norma culta",
    full: "Demonstrar domínio da modalidade escrita formal da língua portuguesa.",
    levels: {
      200: "Excelente domínio da modalidade escrita formal e de escolha de registro. Desvios gramaticais ou de convenções da escrita só como excepcionalidade e sem reincidência.",
      160: "Bom domínio da modalidade escrita formal e de escolha de registro, com poucos desvios gramaticais e de convenções da escrita.",
      120: "Domínio mediano da modalidade escrita formal e de escolha de registro, com alguns desvios gramaticais e de convenções da escrita.",
      80: "Domínio insuficiente da modalidade escrita formal, com muitos desvios gramaticais, de escolha de registro e de convenções da escrita.",
      40: "Domínio precário da modalidade escrita formal, de forma sistemática, com diversificados e frequentes desvios gramaticais, de escolha de registro e de convenções da escrita.",
      0: "Desconhecimento da modalidade escrita formal da língua portuguesa.",
    },
  },
  {
    key: "compreensao",
    id: "C2",
    name: "Compreensão do tema e tipo textual",
    full: "Compreender a proposta e aplicar conceitos das várias áreas do conhecimento para desenvolver o tema, nos limites estruturais do texto dissertativo-argumentativo em prosa.",
    levels: {
      200: "Desenvolve o tema por meio de argumentação consistente, a partir de um repertório sociocultural produtivo, e apresenta excelente domínio do texto dissertativo-argumentativo.",
      160: "Desenvolve o tema por meio de argumentação consistente e apresenta bom domínio do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.",
      120: "Desenvolve o tema por meio de argumentação previsível e apresenta domínio mediano do texto dissertativo-argumentativo, com proposição, argumentação e conclusão.",
      80: "Desenvolve o tema recorrendo à cópia de trechos dos textos motivadores ou apresenta domínio insuficiente do texto dissertativo-argumentativo, não atendendo à estrutura com proposição, argumentação e conclusão.",
      40: "Apresenta o assunto, tangenciando o tema, ou demonstra domínio precário do texto dissertativo-argumentativo, com traços constantes de outros tipos textuais.",
      0: "Fuga ao tema ou não atendimento à estrutura dissertativo-argumentativa (anula a redação).",
    },
  },
  {
    key: "argumentacao",
    id: "C3",
    name: "Seleção e organização dos argumentos",
    full: "Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.",
    levels: {
      200: "Informações, fatos e opiniões relacionados ao tema, de forma consistente e organizada, configurando autoria, em defesa de um ponto de vista.",
      160: "Informações, fatos e opiniões relacionados ao tema, de forma organizada, com indícios de autoria, em defesa de um ponto de vista.",
      120: "Informações, fatos e opiniões relacionados ao tema, limitados aos argumentos dos textos motivadores e pouco organizados, em defesa de um ponto de vista.",
      80: "Informações, fatos e opiniões relacionados ao tema, mas desorganizados ou contraditórios e limitados aos argumentos dos textos motivadores.",
      40: "Informações, fatos e opiniões pouco relacionados ao tema ou incoerentes e sem defesa de um ponto de vista.",
      0: "Informações, fatos e opiniões não relacionados ao tema e sem defesa de um ponto de vista.",
    },
  },
  {
    key: "coesao",
    id: "C4",
    name: "Coesão textual",
    full: "Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.",
    levels: {
      200: "Articula bem as partes do texto e apresenta repertório diversificado de recursos coesivos.",
      160: "Articula as partes do texto, com poucas inadequações, e apresenta repertório diversificado de recursos coesivos.",
      120: "Articula as partes do texto, de forma mediana, com inadequações, e apresenta repertório pouco diversificado de recursos coesivos.",
      80: "Articula as partes do texto, de forma insuficiente, com muitas inadequações, e apresenta repertório limitado de recursos coesivos.",
      40: "Articula as partes do texto de forma precária.",
      0: "Não articula as informações.",
    },
  },
  {
    key: "proposta",
    id: "C5",
    name: "Proposta de intervenção",
    full: "Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.",
    levels: {
      200: "Elabora muito bem proposta de intervenção, detalhada, relacionada ao tema e articulada à discussão desenvolvida no texto.",
      160: "Elabora bem proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.",
      120: "Elabora, de forma mediana, proposta de intervenção relacionada ao tema e articulada à discussão desenvolvida no texto.",
      80: "Elabora, de forma insuficiente, proposta de intervenção relacionada ao tema, ou não articulada com a discussão desenvolvida no texto.",
      40: "Apresenta proposta de intervenção vaga, precária ou relacionada apenas ao assunto.",
      0: "Não apresenta proposta de intervenção, apresenta proposta não relacionada ao tema ou ao assunto, ou proposta que desrespeita os direitos humanos.",
    },
  },
] as const;

export type CompetencyKey = (typeof ENEM_COMPETENCIES)[number]["key"];

/** Os cinco elementos esperados na proposta de intervenção (Competência V). */
export const INTERVENTION_ELEMENTS = [
  { key: "agente", label: "Agente (quem executa)" },
  { key: "acao", label: "Ação (o que fazer)" },
  { key: "meio", label: "Modo ou meio (como fazer)" },
  { key: "finalidade", label: "Efeito ou finalidade (para quê)" },
  { key: "detalhamento", label: "Detalhamento de algum elemento" },
] as const;

/** Situações que zeram a redação inteira, segundo a cartilha. */
export const ZERO_REASONS = {
  nenhuma: null,
  fuga_ao_tema: "Fuga total ao tema",
  tipo_textual: "Não atende ao tipo dissertativo-argumentativo",
  texto_insuficiente: "Texto insuficiente (até 7 linhas)",
  parte_desconectada: "Parte do texto deliberadamente desconectada do tema",
  anulacao: "Impropérios, desenhos ou outras formas propositais de anulação",
  identificacao: "Nome, assinatura ou outra forma de identificação no texto",
} as const;

export type ZeroReason = keyof typeof ZERO_REASONS;

function gridForPrompt() {
  return ENEM_COMPETENCIES.map((competency) => {
    const levels = ENEM_LEVELS.slice()
      .reverse()
      .map((level) => `  ${level}: ${competency.levels[level]}`)
      .join("\n");
    return `${competency.id} (${competency.key}) — ${competency.full}\n${levels}`;
  }).join("\n\n");
}

/** Versão do prompt de correção: mude ao alterar critérios, para comparar resultados ao longo do tempo. */
export const ESSAY_PROMPT_VERSION = "enem-inep-2025.1";

export function buildEnemEssayPrompt(input: { theme: string; title: string; content: string; learnerContext?: string }) {
  return `Você é um(a) avaliador(a) experiente da redação do Enem, treinado(a) na grade oficial do INEP. Corrija a redação abaixo exatamente como a banca faria.

TEMA: ${input.theme}
TÍTULO: ${input.title}
REDAÇÃO:
"""
${input.content}
"""

GRADE OFICIAL (cada competência recebe SOMENTE um destes níveis: 0, 40, 80, 120, 160 ou 200):
${gridForPrompt()}

REGRAS DA BANCA:
- Nota zero na redação inteira (zeroReason diferente de "nenhuma") se houver: fuga total ao tema; não atendimento ao tipo dissertativo-argumentativo; texto com até 7 linhas; parte deliberadamente desconectada do tema; impropérios, desenhos ou anulação proposital; nome ou assinatura no texto. Nesses casos, todas as competências ficam com 0.
- Tangenciamento (abordagem parcial do tema, só o assunto amplo): no máximo 40 na Competência II; a cartilha também penaliza a III e a V, que ficam no nível 40 (informações pouco relacionadas ao tema; proposta relacionada apenas ao assunto).
- Proposta de intervenção que desrespeite os direitos humanos (violência, tortura, "justiça com as próprias mãos", discriminação): Competência V = 0, sem zerar o resto.
- Competência V: verifique os 5 elementos (agente, ação, modo/meio, efeito/finalidade, detalhamento). Proposta completa e articulada com os 5 elementos tende a 200; cada elemento ausente reduz um nível.
- Trechos copiados dos textos motivadores não contam como argumentação própria.
- Seja rigoroso como a banca: 200 só com excelência real. Não arredonde para cima por simpatia.

PARA CADA COMPETÊNCIA: escolha o nível, justifique pelo descritor da grade e cite um trecho curto do texto como evidência (ou "—" se não houver). Diga o que fazer para subir um nível.

Depois: pelo menos 2 pontos fortes e 2 melhorias acionáveis, específicos deste texto, e um comentário geral de 2 a 4 frases.${input.learnerContext ? `\n\nSOBRE O ALUNO (ajuste o tom e os exemplos das explicações, nunca a nota):\n${input.learnerContext}` : ""}

Responda em português do Brasil, só com o JSON pedido.`;
}

const competencySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Somente 0, 40, 80, 120, 160 ou 200." },
    feedback: { type: Type.STRING },
    evidence: { type: Type.STRING },
    nextLevel: { type: Type.STRING },
  },
  required: ["score", "feedback", "evidence", "nextLevel"],
  propertyOrdering: ["score", "feedback", "evidence", "nextLevel"],
};

export const enemEssaySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    zeroReason: { type: Type.STRING, enum: Object.keys(ZERO_REASONS) },
    criteria: {
      type: Type.OBJECT,
      properties: Object.fromEntries(ENEM_COMPETENCIES.map((competency) => [competency.key, competencySchema])),
      required: ENEM_COMPETENCIES.map((competency) => competency.key),
      propertyOrdering: ENEM_COMPETENCIES.map((competency) => competency.key),
    },
    interventionElements: {
      type: Type.OBJECT,
      properties: Object.fromEntries(INTERVENTION_ELEMENTS.map((element) => [element.key, { type: Type.BOOLEAN }])),
      required: INTERVENTION_ELEMENTS.map((element) => element.key),
    },
    humanRightsViolation: { type: Type.BOOLEAN },
    tangency: { type: Type.BOOLEAN },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
    generalFeedback: { type: Type.STRING },
  },
  required: ["zeroReason", "criteria", "interventionElements", "humanRightsViolation", "tangency", "strengths", "improvements", "generalFeedback"],
  propertyOrdering: ["zeroReason", "tangency", "humanRightsViolation", "criteria", "interventionElements", "strengths", "improvements", "generalFeedback"],
};

type RawCompetency = { score?: unknown; feedback?: unknown; evidence?: unknown; nextLevel?: unknown };
export type RawEnemFeedback = {
  zeroReason?: unknown;
  criteria?: Record<string, RawCompetency>;
  interventionElements?: Record<string, unknown>;
  humanRightsViolation?: unknown;
  tangency?: unknown;
  strengths?: unknown;
  improvements?: unknown;
  generalFeedback?: unknown;
};

/** Leva qualquer número ao nível válido mais próximo da grade (0, 40, ..., 200). */
export function snapToLevel(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(200, Math.max(0, Math.round(n / 40) * 40));
}

const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

/**
 * Aplica as regras da banca sobre a resposta da IA: níveis válidos, nota zero, tangenciamento
 * e direitos humanos. A nota total é sempre a soma das competências (nunca a da IA).
 */
export function normalizeEnemFeedback(raw: RawEnemFeedback): EssayFeedback {
  const zeroReason = (Object.keys(ZERO_REASONS).includes(String(raw.zeroReason)) ? String(raw.zeroReason) : "nenhuma") as ZeroReason;
  const tangency = raw.tangency === true;
  const humanRightsViolation = raw.humanRightsViolation === true;

  const criteria: EssayFeedback["criteria"] = {};
  for (const competency of ENEM_COMPETENCIES) {
    const item = raw.criteria?.[competency.key] ?? {};
    let score = snapToLevel(item.score);
    if (zeroReason !== "nenhuma") score = 0;
    if (tangency && competency.key === "compreensao") score = Math.min(score, 40);
    // Tangenciar o tema também derruba a III e a V para o nível 40 (descritores "pouco relacionados ao tema" e "apenas ao assunto").
    if (tangency && (competency.key === "argumentacao" || competency.key === "proposta")) score = Math.min(score, 40);
    if (humanRightsViolation && competency.key === "proposta") score = 0;
    criteria[competency.key] = {
      score,
      feedback: text(item.feedback) || competency.levels[score as (typeof ENEM_LEVELS)[number]],
      evidence: text(item.evidence),
      nextLevel: score < 200 ? text(item.nextLevel) : "",
      level: competency.levels[score as (typeof ENEM_LEVELS)[number]],
    };
  }

  const strengths = list(raw.strengths);
  const improvements = list(raw.improvements);
  if (zeroReason === "nenhuma" && (strengths.length < 1 || improvements.length < 1)) {
    throw new Error("A IA retornou feedback de redacao incompleto.");
  }

  return {
    totalScore: Object.values(criteria).reduce((sum, item) => sum + item.score, 0),
    criteria,
    strengths,
    improvements,
    generalFeedback: text(raw.generalFeedback) || "Correção concluída.",
    zeroReason: ZERO_REASONS[zeroReason] ?? null,
    tangency,
    humanRightsViolation,
    interventionElements: Object.fromEntries(
      INTERVENTION_ELEMENTS.map((element) => [element.key, raw.interventionElements?.[element.key] === true]),
    ),
    promptVersion: ESSAY_PROMPT_VERSION,
  };
}
