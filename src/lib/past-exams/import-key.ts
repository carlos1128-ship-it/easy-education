import { parse } from "csv-parse/sync";
import { ExamError } from "./domain";

export type ImportedAnswer = {
  number: number;
  correct: string;
  annulled: boolean;
};
function validateRows(rows: string[][]): ImportedAnswer[] {
  const parsed = rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => {
      const number = Number(row[0]),
        correct = (row[1] ?? "").trim().toUpperCase();
      if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 1000 ||
        !/^(A|B|C|D|E|ANULADA|X)$/.test(correct)
      )
        throw new ExamError(
          "Formato esperado: número, resposta (A–E, C/E, ANULADA). Confira a prévia antes de publicar.",
        );
      return {
        number,
        correct: ["ANULADA", "X"].includes(correct) ? "" : correct,
        annulled: ["ANULADA", "X"].includes(correct),
      };
    });
  if (
    !parsed.length ||
    parsed.length > 300 ||
    new Set(parsed.map((r) => r.number)).size !== parsed.length
  )
    throw new ExamError(
      "Gabarito vazio, muito grande ou com números duplicados. Separe os cadernos antes de importar.",
    );
  return parsed;
}
export function parseKeyCsv(text: string) {
  const rows = parse(text, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    max_record_size: 16000,
    delimiter: text.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",",
  }) as string[][];
  if (rows[0] && /^(numero|número|questao|questão|number)$/i.test(rows[0][0]))
    rows.shift();
  return validateRows(rows);
}
export function parseKeyText(text: string) {
  // Conservative extraction: ambiguous multi-column layouts stay in the human-review preview.
  const rows = text
    .split(/\r?\n/)
    .map((line) =>
      line.trim().match(/^(\d{1,3})\s*[-:;.\s]\s*(A|B|C|D|E|ANULADA|X)$/i),
    )
    .filter((m) => !!m)
    .map((m) => [m![1], m![2]]);
  return rows.length ? validateRows(rows) : [];
}
export async function importKeyFile(file: File) {
  if (file.size > 3_000_000)
    throw new ExamError("O gabarito deve ter até 3 MB.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".csv"))
    return { rows: parseKeyCsv(new TextDecoder().decode(bytes)), text: "" };
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    if (workbook.worksheets.length !== 1)
      throw new ExamError("Use uma planilha com apenas um caderno/aba.");
    const sheet = workbook.worksheets[0];
    if (sheet.rowCount > 301)
      throw new ExamError("Máximo de 300 questões por arquivo.");
    const rows: string[][] = [];
    sheet.eachRow((row) =>
      rows.push([row.getCell(1).text, row.getCell(2).text]),
    );
    if (rows[0] && /^(numero|número|questao|questão|number)$/i.test(rows[0][0]))
      rows.shift();
    return { rows: validateRows(rows), text: "" };
  }
  if (
    file.name.toLowerCase().endsWith(".pdf") &&
    new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-"
  ) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      const info = await parser.getInfo();
      if (info.total > 30)
        throw new ExamError("O gabarito deve ter até 30 páginas.");
      const extracted = await parser.getText();
      const text = extracted.text.slice(0, 60000);
      return { rows: parseKeyText(text), text };
    } finally {
      await parser.destroy();
    }
  }
  throw new ExamError("Envie PDF, CSV ou XLSX.");
}
