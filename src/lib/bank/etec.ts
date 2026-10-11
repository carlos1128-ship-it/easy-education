/**
 * Provas do Centro Paula Souza: Vestibulinho ETEC e Vestibular FATEC. Leitura do gabarito oficial em PDF (texto
 * extraído) e a lista dos cadernos importados. O código é o da pasta do arquivo nos sites oficiais
 * (https://vestibulinho.etec.sp.gov.br/provas-gabaritos/ e https://vestibular.fatec.sp.gov.br/provas-gabaritos/).
 */
export type CpsEdition = { year: number; semester: 1 | 2 };

export const ETEC_EXAMS: Record<string, CpsEdition> = {
  "201718301": { year: 2017, semester: 1 },
  "201727490": { year: 2017, semester: 2 },
  "201816012": { year: 2018, semester: 1 },
  "201826901": { year: 2018, semester: 2 },
  "201917532": { year: 2019, semester: 1 },
  "201927134": { year: 2019, semester: 2 },
  "202017430": { year: 2020, semester: 1 },
  "2022027483": { year: 2022, semester: 2 },
  "202311698": { year: 2023, semester: 1 },
  "202323718": { year: 2023, semester: 2 },
  "202423718": { year: 2024, semester: 1 },
  "20242918930": { year: 2024, semester: 2 },
  "20251468190": { year: 2025, semester: 1 },
  "20261176943": { year: 2026, semester: 1 },
  "20262210689": { year: 2026, semester: 2 },
};

export const FATEC_EXAMS: Record<string, CpsEdition> = {
  "201718392": { year: 2017, semester: 1 },
  "201729482": { year: 2017, semester: 2 },
  "201814793": { year: 2018, semester: 1 },
  "201827920": { year: 2018, semester: 2 },
  "201916513": { year: 2019, semester: 1 },
  "201928914": { year: 2019, semester: 2 },
  "202016520": { year: 2020, semester: 1 },
  "202228712": { year: 2022, semester: 2 },
  "202315287": { year: 2023, semester: 1 },
  "202327519": { year: 2023, semester: 2 },
  "202415903": { year: 2024, semester: 1 },
  "202426517": { year: 2024, semester: 2 },
  "202528719": { year: 2025, semester: 2 },
  "202619102": { year: 2026, semester: 1 },
  "202626241": { year: 2026, semester: 2 },
};

/** Cadernos por exame (slug do banco). */
export const CPS_EXAMS: Record<"etec" | "fatec", { name: string; editions: Record<string, CpsEdition> }> = {
  etec: { name: "Vestibulinho ETEC (Centro Paula Souza)", editions: ETEC_EXAMS },
  fatec: { name: "Vestibular FATEC (Centro Paula Souza)", editions: FATEC_EXAMS },
};

export function etecEdition(semester: 1 | 2) {
  return `${semester}º semestre`;
}

export type AnswerKeyEntry = { answer: string | null; discipline: string | null };

/**
 * Gabarito: linhas com "número alternativa coluna", em uma ou duas colunas por linha. A terceira coluna é o
 * critério de desempate (ETEC: "C2") ou a disciplina (FATEC: "Raciocínio Lógico"). Anulada fica com answer null.
 */
export function parseAnswerKey(text: string) {
  const entries = new Map<number, AnswerKeyEntry>();
  for (const line of text.split("\n")) {
    const tokens = line.split(/\s+/).filter(Boolean);
    let current: { number: number; answer: string | null; words: string[] } | null = null;
    const flush = () => {
      if (current && !entries.has(current.number)) {
        const discipline = current.words.join(" ").trim();
        entries.set(current.number, { answer: current.answer, discipline: discipline && !/^C\d$/.test(discipline) ? discipline : null });
      }
      current = null;
    };
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const next = tokens[index + 1] ?? "";
      if (/^\d{1,3}$/.test(token) && /^(ANULADA|Anulada|[A-E])$/.test(next) && Number(token) >= 1 && Number(token) <= 90) {
        flush();
        current = { number: Number(token), answer: /^[A-E]$/.test(next) ? next : null, words: [] };
        index += 1;
        continue;
      }
      if (current) current.words.push(token);
    }
    flush();
  }
  return entries;
}

/** Só as respostas (anuladas fora). */
export function parseEtecAnswerKey(text: string) {
  const answers = new Map<number, string>();
  for (const [number, entry] of parseAnswerKey(text)) if (entry.answer) answers.set(number, entry.answer);
  return answers;
}

/** Total de questões do caderno, pelo maior número do gabarito (anuladas contam). */
export function etecQuestionCount(text: string) {
  return Math.max(0, ...parseAnswerKey(text).keys());
}

type Key = Map<number, string>;

/** Pares "número letra" de uma linha, na ordem (aceita "12 B", "12 - B", "12-B", "12‐ B"). */
function linePairs(line: string) {
  return [...line.matchAll(/(?:^|[\s\t])(\d{1,2})\s*[-–‐]?\s*([A-E])(?=$|[\s\t])/g)].map((match) => ({ number: Number(match[1]), letter: match[2] }));
}

/** Junta as colunas de uma tabela de gabarito em versões: coluna cujos números repetem os da versão atual abre outra. */
function columnsToVersions(lines: string[]) {
  const columns: Key[] = [];
  for (const line of lines) {
    linePairs(line).forEach((pair, index) => {
      columns[index] ??= new Map();
      if (!columns[index].has(pair.number)) columns[index].set(pair.number, pair.letter);
    });
  }
  const versions: Key[] = [];
  let current: Key | null = null;
  for (const column of columns.filter((item) => item && item.size >= 3)) {
    const overlaps = current && [...column.keys()].some((number) => current?.has(number));
    if (!current || overlaps) {
      current = new Map(column);
      versions.push(current);
    } else {
      for (const [number, letter] of column) current.set(number, letter);
    }
  }
  return versions;
}

/**
 * Todas as versões de um gabarito de vestibular (provas com a ordem das questões embaralhada por versão).
 * Formatos: tabela com uma coluna por versão (FUVEST 2025, UNICAMP 2011), blocos "Versão N" (UNESP), pares com a
 * letra da prova na frente ("V 01-B", FUVEST 2011-2017) e linhas "resposta + número em cada grupo" (FUVEST 2010).
 * A versão certa do caderno é escolhida depois (import-etec.ts confere com a resolução da IA).
 */
export function parseKeyVersions(text: string): Key[] {
  // "V 01-B K 01-B ...": a letra da prova vem antes de cada par.
  const prefixed = [...text.matchAll(/(?:^|\s)([VKQXZ])\s*(\d{2})\s*[-–‐]\s*([A-E])/g)];
  if (prefixed.length >= 40) {
    const byProva = new Map<string, Key>();
    for (const match of prefixed) {
      const key = byProva.get(match[1]) ?? new Map<number, string>();
      if (!key.has(Number(match[2]))) key.set(Number(match[2]), match[3]);
      byProva.set(match[1], key);
    }
    return [...byProva.values()];
  }
  // "C 01 01 01 01 01": a resposta e o número da questão em cada um dos 5 grupos.
  const grouped = [...text.matchAll(/(?:^|\s)([A-E])((?:[\s\t]+\d{2}){5})(?=\s)/g)];
  if (grouped.length >= 40) {
    const groups: Key[] = Array.from({ length: 5 }, () => new Map());
    for (const match of grouped) {
      match[2].trim().split(/\s+/).forEach((number, index) => {
        if (!groups[index].has(Number(number))) groups[index].set(Number(number), match[1]);
      });
    }
    return groups;
  }
  // Blocos "Versão 1", "Versão 2"...: cada bloco é uma tabela.
  const blocks = text.split(/vers[aã]o\s*\d+/i);
  if (blocks.length > 1) return blocks.slice(1).flatMap((block) => columnsToVersions(block.split("\n"))).filter((key) => key.size >= 20);
  return columnsToVersions(text.split("\n")).filter((key) => key.size >= 20);
}

/** Disciplina do gabarito da FATEC → matéria do banco (Multidisciplinar fica para a IA classificar). */
export function disciplineToSubject(discipline: string | null) {
  const value = (discipline ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/portugues|gramatica|interpretacao/.test(value)) return "lingua-portuguesa";
  if (/literatura/.test(value)) return "literatura";
  if (/matematica|raciocinio|\brac\b/.test(value)) return "matematica";
  if (/ingles/.test(value)) return "ingles";
  if (/historia/.test(value)) return "historia";
  if (/geografia/.test(value)) return "geografia";
  if (/biologia/.test(value)) return "biologia";
  if (/quimica/.test(value)) return "quimica";
  if (/fisica/.test(value)) return "fisica";
  if (/filosofia/.test(value)) return "filosofia";
  if (/sociologia/.test(value)) return "sociologia";
  return null;
}
