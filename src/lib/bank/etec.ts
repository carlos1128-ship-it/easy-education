/**
 * Vestibulinho ETEC (Centro Paula Souza): leitura do gabarito oficial em PDF (texto extraído) e a lista
 * dos cadernos importados. O código é o da pasta do arquivo no site oficial
 * (https://vestibulinho.etec.sp.gov.br/provas-gabaritos/).
 */
export const ETEC_EXAMS: Record<string, { year: number; semester: 1 | 2 }> = {
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

export function etecEdition(semester: 1 | 2) {
  return `${semester}º semestre`;
}

/**
 * Gabarito: pares "número alternativa critério" (ex.: "12 B C5" ou "012 B C5"), em uma ou duas colunas por linha.
 * Questão anulada fica fora do mapa.
 */
export function parseEtecAnswerKey(text: string) {
  const answers = new Map<number, string>();
  const pattern = /(?:^|\s)(\d{1,3})\s+(ANULADA|[A-E])\s+C\d/g;
  for (const match of text.matchAll(pattern)) {
    const number = Number(match[1]);
    if (number < 1 || number > 60 || answers.has(number)) continue;
    if (match[2] !== "ANULADA") answers.set(number, match[2]);
  }
  return answers;
}

/** Total de questões do caderno, pelo maior número do gabarito (anuladas contam). */
export function etecQuestionCount(text: string) {
  let max = 0;
  for (const match of text.matchAll(/(?:^|\s)(\d{1,3})\s+(?:ANULADA|[A-E])\s+C\d/g)) max = Math.max(max, Number(match[1]));
  return max;
}
