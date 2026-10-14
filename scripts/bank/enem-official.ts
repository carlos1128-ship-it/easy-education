/**
 * ENEM com os documentos oficiais do INEP (licença CC BY-ND 3.0: reproduzir com crédito, sem alterar).
 *
 *  1. Capas: a 1ª página do caderno azul do 1º dia e do amarelo do 2º dia, reduzida, vira a capa do caderno
 *     na área Provas anteriores (public/exam-covers + src/lib/bank/exam-covers.json). A imagem não é editada.
 *  2. Gabaritos: lê o gabarito oficial de cada dia e compara, questão por questão, com o gabarito do banco.
 *     NÃO corrige nada: só mostra as divergências para alguém conferir.
 *
 *   npx tsx --env-file=.env.local scripts/bank/enem-official.ts --tmp <pasta-temporaria> [--year 2023]
 *
 * Os PDFs ficam na pasta temporária (fora do repositório). Endereços tirados das páginas do INEP em 14/10/2026.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { enemDayNumbers } from "@/lib/bank/past-exams";
import { getPrisma } from "@/lib/prisma";

const NEW = (year: number, kind: "PV" | "GB", day: 1 | 2, cd: number) => `https://download.inep.gov.br/enem/provas_e_gabaritos/${year}_${kind}_impresso_D${day}_CD${cd}.pdf`;
const OLD = "https://download.inep.gov.br/educacao_basica/enem";

type DaySource = { prova: string; gabaritos: string[] };
/** Por ano: 1º dia (caderno 1, azul) e 2º dia (caderno 5, amarelo; o gabarito do 7, azul, também é conferido). */
const SOURCES: Record<number, { 1: DaySource; 2: DaySource }> = {
  2023: { 1: { prova: NEW(2023, "PV", 1, 1), gabaritos: [NEW(2023, "GB", 1, 1)] }, 2: { prova: NEW(2023, "PV", 2, 5), gabaritos: [NEW(2023, "GB", 2, 5), NEW(2023, "GB", 2, 7)] } },
  2022: { 1: { prova: NEW(2022, "PV", 1, 1), gabaritos: [NEW(2022, "GB", 1, 1)] }, 2: { prova: NEW(2022, "PV", 2, 5), gabaritos: [NEW(2022, "GB", 2, 5), NEW(2022, "GB", 2, 7)] } },
  2021: { 1: { prova: NEW(2021, "PV", 1, 1), gabaritos: [NEW(2021, "GB", 1, 1)] }, 2: { prova: NEW(2021, "PV", 2, 5), gabaritos: [NEW(2021, "GB", 2, 5), NEW(2021, "GB", 2, 7)] } },
  2020: { 1: { prova: NEW(2020, "PV", 1, 1), gabaritos: [NEW(2020, "GB", 1, 1)] }, 2: { prova: NEW(2020, "PV", 2, 5), gabaritos: [NEW(2020, "GB", 2, 5), NEW(2020, "GB", 2, 7)] } },
  2019: {
    1: { prova: `${OLD}/provas/2019/2019_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2019/gabarito_1_dia_caderno_1_azul_aplicacao_regular.pdf`] },
    2: { prova: `${OLD}/provas/2019/2019_PV_impresso_D2_CD5.pdf`, gabaritos: [`${OLD}/gabaritos/2019/gabarito_2_dia_caderno_5_amarelo_aplicacao_regular.pdf`, `${OLD}/gabaritos/2019/gabarito_2_dia_caderno_7_azul_aplicacao_regular.pdf`] },
  },
  2018: {
    1: { prova: `${OLD}/provas/2018/2018_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2018/GAB_ENEM_2018_DIA_1_AZUL.pdf`] },
    2: { prova: `${OLD}/provas/2018/2DIA_05_AMARELO_BAIXA.pdf`, gabaritos: [`${OLD}/gabaritos/2018/GAB_ENEM_2018_DIA_2_AMARELO.pdf`, `${OLD}/gabaritos/2018/GAB_ENEM_2018_DIA_2_AZUL.pdf`] },
  },
  2017: {
    1: { prova: `${OLD}/provas/2017/2017_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2017/cad_1_gabarito_azul_5112017.pdf`] },
    2: { prova: `${OLD}/provas/2017/2017_PV_impresso_D2_CD5.pdf`, gabaritos: [`${OLD}/gabaritos/2017/cad_5_gabarito_amarelo_12112017.pdf`, `${OLD}/gabaritos/2017/cad_7_gabarito_azul_12112017.pdf`] },
  },
  2016: {
    1: { prova: `${OLD}/provas/2016/2016_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2016/GAB_ENEM_2016_DIA_1_01_AZUL.pdf`] },
    2: { prova: `${OLD}/provas/2016/2016_PV_impresso_D2_CD5.pdf`, gabaritos: [`${OLD}/gabaritos/2016/GAB_ENEM_2016_DIA_2_05_AMARELO.pdf`, `${OLD}/gabaritos/2016/GAB_ENEM_2016_DIA_2_07_AZUL.pdf`] },
  },
  2015: {
    1: { prova: `${OLD}/provas/2015/2015_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2015/CADERNO_1_AZUL_SABADO.pdf`] },
    2: { prova: `${OLD}/provas/2015/2015_PV_impresso_D2_CD5.pdf`, gabaritos: [`${OLD}/gabaritos/2015/CADERNO_5_AMARELO_DOMINGO.pdf`, `${OLD}/gabaritos/2015/CADERNO_7_AZUL_DOMINGO.pdf`] },
  },
  2014: {
    1: { prova: `${OLD}/provas/2014/2014_PV_impresso_D1_CD1.pdf`, gabaritos: [`${OLD}/gabaritos/2014/CADERNO_1_AZUL_SABADO.pdf`] },
    2: { prova: `${OLD}/provas/2014/2014_PV_impresso_D2_CD5.pdf`, gabaritos: [`${OLD}/gabaritos/2014/CADERNO_5_AMARELO_DOMINGO.pdf`, `${OLD}/gabaritos/2014/CADERNO_7_AZUL_DOMINGO.pdf`] },
  },
  2013: {
    1: { prova: `${OLD}/provas/2013/dia1_caderno1_azul.pdf`, gabaritos: [`${OLD}/gabaritos/2013/dia1_azul.pdf`] },
    2: { prova: `${OLD}/provas/2013/dia2_caderno5_amarelo.pdf`, gabaritos: [`${OLD}/gabaritos/2013/dia2_amarelo.pdf`, `${OLD}/gabaritos/2013/dia2_azul.pdf`] },
  },
  2012: {
    1: { prova: `${OLD}/provas/2012/dia1_caderno1_azul.pdf`, gabaritos: [`${OLD}/gabaritos/2012/dia1_azul.pdf`] },
    2: { prova: `${OLD}/provas/2012/dia2_caderno5_amarelo.pdf`, gabaritos: [`${OLD}/gabaritos/2012/dia2_amarelo.pdf`, `${OLD}/gabaritos/2012/dia2_azul.pdf`] },
  },
  2011: {
    1: { prova: `${OLD}/provas/2011/dia1_caderno1_azul.pdf`, gabaritos: [`${OLD}/gabaritos/2011/01_AZUL_GABARITO.pdf`] },
    2: { prova: `${OLD}/provas/2011/dia2_caderno5_amarelo.pdf`, gabaritos: [`${OLD}/gabaritos/2011/05_AMARELO_GABARITO.pdf`, `${OLD}/gabaritos/2011/07_AZUL_GABARITO.pdf`] },
  },
  2010: {
    1: { prova: `${OLD}/provas/2010/dia1_caderno1_azul.pdf`, gabaritos: [`${OLD}/provas/2010/dia1_caderno1_azul_com_gab.pdf`] },
    2: { prova: `${OLD}/provas/2010/dia2_caderno5_amarelo.pdf`, gabaritos: [`${OLD}/provas/2010/dia2_caderno5_amarelo_com_gab.pdf`, `${OLD}/provas/2010/dia2_caderno7_azul_com_gab.pdf`] },
  },
  2009: {
    1: { prova: `${OLD}/provas/2009/dia1_caderno1_azul.pdf`, gabaritos: [`${OLD}/gabaritos/2009/gabarito_dia1.pdf`] },
    2: { prova: `${OLD}/provas/2009/dia2_caderno5_amarelo.pdf`, gabaritos: [`${OLD}/gabaritos/2009/gabarito_dia2.pdf`] },
  },
};

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** Baixa uma vez (fica em cache na pasta temporária). Só do INEP, e só PDF. */
async function download(url: string, dir: string) {
  const parsed = new URL(url);
  if (parsed.hostname !== "download.inep.gov.br" || !parsed.pathname.endsWith(".pdf")) throw new Error(`fonte não permitida: ${url}`);
  const file = join(dir, parsed.pathname.split("/").filter(Boolean).slice(-2).join("_"));
  if (!existsSync(file)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`${response.status} em ${url}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error(`não é PDF: ${url}`);
    await writeFile(file, bytes);
  }
  return new Uint8Array(await readFile(file));
}

/**
 * Um só pdf.js para capa e gabarito. No Node ele mesmo traz Path2D/DOMMatrix da cópia dele do @napi-rs/canvas;
 * não sobrescrever com outra cópia (as duas não se misturam).
 */
async function pdfjs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

/** 1ª página do PDF em WebP, com 320 px de largura, sem nenhuma alteração além do tamanho. */
async function renderCover(bytes: Uint8Array, out: string) {
  const { getDocument } = await pdfjs();
  const pdf = await getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 320 / page.getViewport({ scale: 1 }).width });
    // A tela vem da fábrica do próprio pdf.js (ele usa a cópia dele do @napi-rs/canvas).
    const factory = (pdf as unknown as { canvasFactory: { create: (w: number, h: number) => { canvas: { toBuffer: (type: string, quality?: number) => Buffer }; context: unknown } } }).canvasFactory;
    const { canvas, context } = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: canvas as never, canvasContext: context as never, viewport }).promise;
    await writeFile(out, canvas.toBuffer("image/webp", 82));
  } finally {
    await pdf.destroy();
  }
}

/** Gabarito oficial em texto → número da questão → letras (as 5 de língua estrangeira têm duas: inglês e espanhol). */
export function parseAnswerKey(text: string) {
  const key = new Map<number, string[]>();
  const clean = text.replace(/anulad[ao]/gi, " X ");
  for (const match of clean.matchAll(/(?:^|\s)(\d{1,3})\s+([A-EX])(?:\s+([A-EX]))?(?=\s|$)/g)) {
    const number = Number(match[1]);
    if (number < 1 || number > 180) continue;
    const letters = [match[2], match[3]].filter(Boolean) as string[];
    if (!key.has(number)) key.set(number, letters);
  }
  return key;
}

async function keyFrom(bytes: Uint8Array) {
  const { getDocument } = await pdfjs();
  const pdf = await getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise;
  try {
    const parts: string[] = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const content = await (await pdf.getPage(index)).getTextContent();
      // Alguns PDFs quebram o número em pedaços colados ("12" + "1" = 121): junta dígitos seguidos.
      const pieces: string[] = [];
      for (const item of content.items) {
        const text = "str" in item ? item.str : "";
        const last = pieces.at(-1);
        if (last && /^\d{1,2}$/.test(last) && /^\d{1,2}$/.test(text) && (last + text).length <= 3) pieces[pieces.length - 1] = last + text;
        else pieces.push(text);
      }
      parts.push(pieces.join(" "));
    }
    return parseAnswerKey(parts.join(" "));
  } finally {
    await pdf.destroy();
  }
}

async function main() {
  const tmp = arg("tmp");
  if (!tmp) throw new Error("Informe --tmp <pasta temporária> para os PDFs (fora do repositório).");
  await mkdir(tmp, { recursive: true });
  await mkdir("public/exam-covers", { recursive: true });
  const only = arg("year") ? Number(arg("year")) : null;
  const prisma = getPrisma();
  const manifestPath = "src/lib/bank/exam-covers.json";
  const manifest: Record<string, { cover: string; source: string }> = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
  const report: string[] = [];

  for (const [yearText, days] of Object.entries(SOURCES).sort(([a], [b]) => Number(b) - Number(a))) {
    const year = Number(yearText);
    if (only && year !== only) continue;
    for (const day of [1, 2] as const) {
      const source = days[day];
      try {
        const cover = `/exam-covers/enem-${year}-d${day}.webp`;
        await renderCover(await download(source.prova, tmp), join("public", cover));
        manifest[`enem|${year}||${day}`] = { cover, source: source.prova };
      } catch (error) {
        report.push(`ENEM ${year} ${day}º dia: capa não gerada (${error instanceof Error ? error.message : error})`);
      }

      // Questões do dia no banco (pela numeração oficial), com número e gabarito.
      const rows = await prisma.bankQuestion.findMany({
        where: { exam: { slug: "enem" }, year, origin: "prova_oficial", isPublished: true, number: enemDayNumbers(day) },
        select: { number: true, variant: true, correctLabel: true },
      });
      let best: { url: string; ok: number; wrong: Array<string>; missing: number; missingNumbers: number[] } | null = null;
      for (const url of source.gabaritos) {
        try {
          const key = await keyFrom(await download(url, tmp));
          let ok = 0;
          let missing = 0;
          const missingNumbers: number[] = [];
          const wrong: string[] = [];
          for (const row of rows) {
            const letters = key.get(row.number);
            if (!letters?.length) {
              missing += 1;
              missingNumbers.push(row.number);
              continue;
            }
            // Língua estrangeira: inglês é a 1ª coluna, espanhol a 2ª.
            const official = row.variant === "espanhol" ? (letters[1] ?? letters[0]) : letters[0];
            if (official === "X") ok += 1;
            else if (official === row.correctLabel) ok += 1;
            else wrong.push(`Q${row.number}${row.variant ? ` (${row.variant})` : ""}: banco ${row.correctLabel}, oficial ${official}`);
          }
          if (!best || ok > best.ok) best = { url, ok, wrong, missing, missingNumbers };
        } catch (error) {
          report.push(`ENEM ${year} ${day}º dia: gabarito ilegível (${error instanceof Error ? error.message : error})`);
        }
      }
      if (best) {
        const line = `ENEM ${year} ${day}º dia: ${best.ok}/${rows.length} conferem com ${best.url.split("/").pop()}${best.missing ? `, ${best.missing} sem número no gabarito` : ""}${best.wrong.length ? `, ${best.wrong.length} divergem` : ""}`;
        console.log(line);
        report.push(line, ...best.wrong.map((item) => `   ${item}`), ...(best.missingNumbers.length ? [`   sem leitura: ${[...new Set(best.missingNumbers)].sort((a, b) => a - b).join(", ")}`] : []));
      }
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(tmp, "relatorio-gabaritos-enem.txt"), `${report.join("\n")}\n`);
  console.log(`\nCapas no manifesto: ${Object.keys(manifest).length}. Relatório completo: ${join(tmp, "relatorio-gabaritos-enem.txt")}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
