/** Textos e valores fixos do banco de questões (rótulos em português para a interface). */

export const ORIGIN = { official: "prova_oficial", ai: "gerada_ia" } as const;
export type QuestionOrigin = (typeof ORIGIN)[keyof typeof ORIGIN];

/**
 * "avaliada_correta" e "avaliada_incorreta" são o veredito da revisão humana das questões geradas para a
 * avaliação de confiabilidade (scripts/eval). Correta = gabarito certo, só uma alternativa defensável e
 * explicação sem erro factual.
 */
export const REVIEW_STATUS = ["nao_revisada", "amostra_revisada", "revisada", "avaliada_correta", "avaliada_incorreta"] as const;
export type ReviewStatus = (typeof REVIEW_STATUS)[number];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  nao_revisada: "Não revisada por professor",
  amostra_revisada: "Amostra revisada",
  revisada: "Revisada por professor",
  avaliada_correta: "Avaliada: correta",
  avaliada_incorreta: "Avaliada: incorreta",
};

/** Lote e dono das questões geradas para a avaliação de confiabilidade (nunca aparecem para alunos). */
export const EVAL_OWNER = "avaliacao";
export const EVAL_BATCH_PREFIX = "eval-";

export const DIFFICULTIES = ["facil", "medio", "dificil"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };

export const REPORT_KINDS = ["enunciado_errado", "gabarito_errado", "imagem_quebrada", "outro"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const REPORT_KIND_LABEL: Record<ReportKind, string> = {
  enunciado_errado: "Enunciado com erro",
  gabarito_errado: "Gabarito errado",
  imagem_quebrada: "Imagem quebrada ou faltando",
  outro: "Outro problema",
};

export const SESSION_KINDS = ["practice", "simulado", "diagnostic"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const ANSWER_FILTERS = ["todas", "nao_respondidas", "erradas", "marcadas"] as const;
export type AnswerFilter = (typeof ANSWER_FILTERS)[number];
export const ANSWER_FILTER_LABEL: Record<AnswerFilter, string> = {
  todas: "Todas",
  nao_respondidas: "Que ainda não respondi",
  erradas: "Que errei",
  marcadas: "Marcadas por mim",
};

export const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

/** Grandes áreas do ENEM (slug da fonte → nome). */
export const ENEM_AREAS: Record<string, string> = {
  linguagens: "Linguagens e Códigos",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
  matematica: "Matemática",
};

/** Exame inicial do banco. Novos exames entram como linhas na tabela `exams`, sem mudar código. */
export const SEED_EXAMS = [
  { slug: "enem", name: "ENEM", styleLabel: "ENEM", sortOrder: 1 },
  { slug: "fuvest", name: "FUVEST", styleLabel: "FUVEST (USP)", sortOrder: 2 },
  { slug: "unicamp", name: "UNICAMP", styleLabel: "vestibular da UNICAMP", sortOrder: 3 },
  { slug: "etec", name: "Vestibulinho ETEC", styleLabel: "Vestibulinho ETEC", sortOrder: 4 },
  { slug: "fatec", name: "FATEC", styleLabel: "vestibular da FATEC", sortOrder: 5 },
  { slug: "unesp", name: "UNESP", styleLabel: "vestibular da UNESP", sortOrder: 6 },
] as const;

/** Exames com provas anteriores na área "Provas anteriores" (ordem da tela). */
export const PAST_EXAMS = {
  enem: { name: "ENEM", short: "ENEM", tagline: "Exame Nacional do Ensino Médio" },
  fuvest: { name: "FUVEST", short: "FUVEST", tagline: "Vestibular da USP · 1ª fase" },
  unicamp: { name: "UNICAMP", short: "UNICAMP", tagline: "Vestibular da Unicamp · 1ª fase" },
  etec: { name: "Vestibulinho ETEC", short: "ETEC", tagline: "Ensino técnico e médio do Centro Paula Souza" },
  fatec: { name: "FATEC", short: "FATEC", tagline: "Vestibular das Faculdades de Tecnologia de SP" },
  unesp: { name: "UNESP", short: "UNESP", tagline: "Vestibular da Unesp (Vunesp) · 1ª fase" },
} as const;
export type PastExamSlug = keyof typeof PAST_EXAMS;

/** Matérias iniciais (a IA classifica cada questão numa delas, dentro da área da questão). */
export const SEED_SUBJECTS: Array<{ slug: string; name: string; area: string; sortOrder: number }> = [
  { slug: "lingua-portuguesa", name: "Língua Portuguesa", area: "linguagens", sortOrder: 10 },
  { slug: "literatura", name: "Literatura", area: "linguagens", sortOrder: 11 },
  { slug: "ingles", name: "Inglês", area: "linguagens", sortOrder: 12 },
  { slug: "espanhol", name: "Espanhol", area: "linguagens", sortOrder: 13 },
  { slug: "artes", name: "Artes", area: "linguagens", sortOrder: 14 },
  { slug: "educacao-fisica", name: "Educação Física", area: "linguagens", sortOrder: 15 },
  { slug: "tecnologias-da-informacao", name: "Tecnologias da Informação", area: "linguagens", sortOrder: 16 },
  { slug: "historia", name: "História", area: "ciencias-humanas", sortOrder: 20 },
  { slug: "geografia", name: "Geografia", area: "ciencias-humanas", sortOrder: 21 },
  { slug: "filosofia", name: "Filosofia", area: "ciencias-humanas", sortOrder: 22 },
  { slug: "sociologia", name: "Sociologia", area: "ciencias-humanas", sortOrder: 23 },
  { slug: "fisica", name: "Física", area: "ciencias-natureza", sortOrder: 30 },
  { slug: "quimica", name: "Química", area: "ciencias-natureza", sortOrder: 31 },
  { slug: "biologia", name: "Biologia", area: "ciencias-natureza", sortOrder: 32 },
  { slug: "matematica", name: "Matemática", area: "matematica", sortOrder: 40 },
];

/** Fonte e licença das questões oficiais importadas (ver docs/fontes-questoes.md). */
export const ENEM_SOURCE = {
  name: "INEP",
  url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
  license: "CC BY-ND 3.0 (site do INEP)",
} as const;

/**
 * Vestibulares sem licença aberta declarada: a prova é pública (publicada pela própria banca) e entra
 * com o texto da prova e a fonte citada em cada questão. Ver docs/fontes-questoes.md (ressalva jurídica).
 */
export const VESTIBULAR_SOURCES = {
  fuvest: {
    name: "FUVEST",
    url: "https://www.fuvest.br/acervo-vestibular/",
    license: "Prova pública da FUVEST, sem licença aberta declarada; uso educacional com citação da fonte. Transcrição: conjunto BLUEX (arXiv 2307.05410)",
  },
  unicamp: {
    name: "Comvest (UNICAMP)",
    url: "https://www.comvest.unicamp.br/vestibulares-anteriores/",
    license: "Prova pública da Comvest, sem licença aberta declarada; uso educacional com citação da fonte. Transcrição: conjunto BLUEX (arXiv 2307.05410)",
  },
  etec: {
    name: "Centro Paula Souza (Vestibulinho ETEC)",
    url: "https://vestibulinho.etec.sp.gov.br/provas-gabaritos/",
    license: "Prova pública do Vestibulinho, \"preservada pela Lei de Propriedade Intelectual\" (termos do site); uso educacional com citação da fonte",
  },
  fatec: {
    name: "Centro Paula Souza (Vestibular FATEC)",
    url: "https://vestibular.fatec.sp.gov.br/provas-gabaritos/",
    license: "Prova pública do Vestibular FATEC (Centro Paula Souza / Fundação FAT), sem licença aberta declarada; uso educacional com citação da fonte",
  },
  unesp: {
    name: "Vunesp (UNESP)",
    url: "https://www.vunesp.com.br/",
    license: "Prova pública do Vestibular UNESP (Vunesp), sem licença aberta declarada; uso educacional com citação da fonte",
  },
} as const;

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
