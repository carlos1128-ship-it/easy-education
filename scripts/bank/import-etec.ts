/**
 * Passo 2 da importação do Vestibulinho ETEC: junta a transcrição (extract-etec.ts) com o gabarito OFICIAL,
 * recorta as figuras das páginas do PDF, classifica a matéria e grava no banco. Fonte: docs/fontes-questoes.md.
 *
 *   npx tsx --env-file=.env.local scripts/bank/import-etec.ts --dir ./etec --json ./etec/json --publish
 *
 * - O gabarito vem do PDF oficial de gabarito, nunca da IA. Questão anulada não entra.
 * - Figuras: a página é renderizada e a caixa informada na transcrição é recortada e enviada ao bucket "questoes".
 * - Matéria: a IA só escolhe a matéria de cada questão numa lista fechada (não muda o texto).
 * - Pode rodar de novo: o que já existe é ignorado.
 */
import fs from "node:fs";
import path from "node:path";
import { Type } from "@google/genai";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { SEED_SUBJECTS, VESTIBULAR_SOURCES } from "@/lib/bank/constants";
import { ETEC_EXAMS, etecEdition, parseEtecAnswerKey } from "@/lib/bank/etec";
import { ensureCatalog } from "@/lib/bank/service";
import { reflowPdfText } from "@/lib/bank/vestibular";
import { getGemini } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "questoes";
const LABELS = ["A", "B", "C", "D", "E"];

type Figure = { page: number; box: number[] };
type Extracted = {
  number: number;
  supportText: string;
  statement: string;
  options: string[];
  figures: Figure[];
  optionFigures: Figure[];
  tableMarkdown?: string;
};

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Recorta a caixa (0 a 1000) da página, com uma folga pequena, e devolve WebP. */
async function crop(page: Buffer, box: number[]) {
  const meta = await sharp(page).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const [y0, x0, y1, x1] = box.map((value) => Math.min(1000, Math.max(0, value)));
  const pad = 8;
  const left = Math.max(0, Math.floor(((x0 - pad) / 1000) * width));
  const top = Math.max(0, Math.floor(((y0 - pad) / 1000) * height));
  const right = Math.min(width, Math.ceil(((x1 + pad) / 1000) * width));
  const bottom = Math.min(height, Math.ceil(((y1 + pad) / 1000) * height));
  if (right - left < 20 || bottom - top < 20) return null;
  return sharp(page).extract({ left, top, width: right - left, height: bottom - top }).flatten({ background: "#ffffff" }).webp({ quality: 86 }).toBuffer();
}

/** A IA escolhe a matéria de cada questão numa lista fechada (só classificação; o texto não muda). */
async function classify(questions: Extracted[]) {
  const allowed = SEED_SUBJECTS.map((subject) => subject.slug);
  const prompt = `Classifique cada questão do Vestibulinho ETEC (ensino fundamental) em UMA matéria, usando só estes slugs: ${allowed.join(", ")}.
Questões interdisciplinares: escolha a matéria do conhecimento que a questão cobra para ser resolvida.
${questions.map((question) => `#${question.number}: ${(question.statement + " " + question.supportText).replace(/\s+/g, " ").slice(0, 420)}`).join("\n")}`;
  for (const model of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"]) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { number: { type: Type.INTEGER }, subject: { type: Type.STRING, enum: allowed } }, required: ["number", "subject"] } },
        },
      });
      const rows = JSON.parse(response.text ?? "[]") as Array<{ number: number; subject: string }>;
      return new Map(rows.filter((row) => allowed.includes(row.subject)).map((row) => [row.number, row.subject]));
    } catch (error) {
      console.warn(`  classificação com ${model} falhou: ${error instanceof Error ? error.message.slice(0, 160) : error}`);
    }
  }
  return new Map<number, string>();
}

async function main() {
  const dir = arg("dir");
  const jsonDir = arg("json");
  if (!dir || !jsonDir) throw new Error("Use --dir <PDFs> --json <transcrições>.");
  const batch = arg("batch") ?? "etec-vestibulinho";

  await ensureCatalog();
  const prisma = getPrisma();
  const supabase = createSupabaseAdminClient();
  if (!(await supabase.storage.getBucket(BUCKET)).data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    if (error) throw error;
  }
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: "etec" } });
  const subjects = new Map((await prisma.bankSubject.findMany({ select: { id: true, slug: true, area: true } })).map((item) => [item.slug, item]));
  const source = VESTIBULAR_SOURCES.etec;
  const total = { imported: 0, existing: 0, rejected: {} as Record<string, number> };
  const reject = (reason: string) => (total.rejected[reason] = (total.rejected[reason] ?? 0) + 1);

  for (const file of fs.readdirSync(jsonDir).filter((name) => name.endsWith(".json")).sort()) {
    const code = file.replace(".json", "");
    const info = ETEC_EXAMS[code];
    if (!info) {
      console.warn(`Caderno ${code} sem ano/semestre cadastrado em ETEC_EXAMS; pulando.`);
      continue;
    }
    const edition = etecEdition(info.semester);
    const questions = JSON.parse(fs.readFileSync(path.join(jsonDir, file), "utf8")) as Extracted[];
    const keyText = (await new PDFParse({ data: fs.readFileSync(path.join(dir, `${code}-gabarito.pdf`)) }).getText()).text;
    const answers = parseEtecAnswerKey(keyText);

    const fresh: Extracted[] = [];
    for (const question of questions) {
      const where = { examId_year_edition_number_variant_origin_ownerUserId: { examId: exam.id, year: info.year, edition, number: question.number, variant: "", origin: "prova_oficial", ownerUserId: "" } };
      if (await prisma.bankQuestion.findUnique({ where, select: { id: true } })) total.existing += 1;
      else fresh.push(question);
    }
    if (!fresh.length) continue;

    const pages = [...new Set(fresh.flatMap((question) => [...question.figures, ...question.optionFigures].map((figure) => figure.page)))];
    const rendered = new Map<number, Buffer>();
    if (pages.length) {
      const shots = await new PDFParse({ data: fs.readFileSync(path.join(dir, `${code}-prova.pdf`)) }).getScreenshot({ partial: pages, scale: 2 });
      for (const shot of shots.pages) rendered.set(shot.pageNumber, Buffer.from(shot.data));
    }
    const subjectOf = await classify(fresh);

    const upload = async (figure: Figure, name: string) => {
      const page = rendered.get(figure.page);
      if (!page || figure.box?.length !== 4) return null;
      const image = await crop(page, figure.box);
      if (!image) return null;
      const target = `vestibular/etec/${code}/${name}.webp`;
      const { error } = await supabase.storage.from(BUCKET).upload(target, image, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
      if (error) throw new Error(`Falha ao enviar ${target}: ${error.message}`);
      return supabase.storage.from(BUCKET).getPublicUrl(target).data.publicUrl;
    };

    let importedHere = 0;
    for (const question of fresh) {
      const correct = answers.get(question.number);
      if (!correct) {
        reject("anulada ou fora do gabarito oficial");
        continue;
      }
      const optionFigures = question.optionFigures?.length === LABELS.length ? question.optionFigures : [];
      if ((question.options ?? []).length !== LABELS.length && !optionFigures.length) {
        reject("alternativas incompletas");
        continue;
      }

      const figureUrls: string[] = [];
      for (const [index, figure] of (question.figures ?? []).entries()) {
        const url = await upload(figure, `${question.number}-${index}`);
        if (url) figureUrls.push(url);
      }
      if ((question.figures ?? []).length && figureUrls.length !== question.figures.length) {
        reject("figura não recortada");
        continue;
      }

      const options = [];
      let broken = false;
      for (const [index, label] of LABELS.entries()) {
        const text = reflowPdfText(question.options?.[index] ?? "");
        const imageUrl = optionFigures[index] ? await upload(optionFigures[index], `${question.number}-${label}`) : null;
        if (!text && !imageUrl) broken = true;
        options.push({ label, text, imageUrl });
      }
      if (broken) {
        reject("alternativa vazia");
        continue;
      }

      const support = [reflowPdfText(question.supportText ?? ""), question.tableMarkdown?.trim() ?? "", ...figureUrls.map((url) => `![Figura da questão](${url})`)].filter(Boolean).join("\n\n");
      const statement = reflowPdfText(question.statement ?? "");
      if (!statement && !support) {
        reject("enunciado vazio");
        continue;
      }
      const subject = subjects.get(subjectOf.get(question.number) ?? "");

      await prisma.bankQuestion.create({
        data: {
          examId: exam.id,
          year: info.year,
          edition,
          number: question.number,
          area: subject?.area ?? null,
          subjectId: subject?.id ?? null,
          statement,
          supportText: support || null,
          images: [...figureUrls, ...options.flatMap((option) => (option.imageUrl ? [option.imageUrl] : []))],
          options,
          correctLabel: correct,
          origin: "prova_oficial",
          sourceName: source.name,
          sourceUrl: source.url,
          license: source.license,
          isPublished: flag("publish"),
          importBatch: batch,
        },
      });
      importedHere += 1;
      total.imported += 1;
    }
    console.log(`ETEC ${info.year} (${edition}): ${importedHere} importadas`);
  }

  console.log("\nResumo:", JSON.stringify(total, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
