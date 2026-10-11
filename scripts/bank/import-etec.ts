/**
 * Passo 2 da importação do Vestibulinho ETEC e do Vestibular FATEC (--exam fatec): junta a transcrição (extract-etec.ts) com o gabarito OFICIAL,
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
import { CPS_EXAMS, disciplineToSubject, etecEdition, parseAnswerKey, parseKeyVersions } from "@/lib/bank/etec";
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
  const prompt = `Classifique cada questão de prova em UMA matéria, usando só estes slugs: ${allowed.join(", ")}.
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

/** Escolhe a versão do gabarito: a IA resolve uma amostra só de texto (sem ver gabarito) e a versão que mais concorda vence. */
async function chooseVersion(questions: Extracted[], versions: Array<Map<number, string>>) {
  const sample = questions.filter((question) => !question.figures?.length && !question.optionFigures?.length).slice(0, 30);
  if (sample.length < 8) return null;
  const prompt = `Resolva cada questão e responda só com a letra correta de cada uma.\n${sample
    .map((question) => `#${question.number}\n${question.supportText ?? ""}\n${question.statement}\n${question.options.map((option, index) => `(${LABELS[index]}) ${option}`).join("\n")}`)
    .join("\n\n")}`;
  for (const model of ["gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"]) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: prompt,
        config: { temperature: 0, responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { number: { type: Type.INTEGER }, answer: { type: Type.STRING } }, required: ["number", "answer"] } } },
      });
      const solved = new Map((JSON.parse(response.text ?? "[]") as Array<{ number: number; answer: string }>).map((row) => [row.number, row.answer.trim().toUpperCase().charAt(0)]));
      const scored = versions.map((key) => ({ key, agreement: sample.filter((question) => solved.get(question.number) && solved.get(question.number) === key.get(question.number)).length / sample.length }));
      scored.sort((a, b) => b.agreement - a.agreement);
      // A versão certa concorda muito mais que as outras (as erradas ficam perto do acaso, ~20%).
      if (scored[0].agreement >= 0.5 && scored[0].agreement - (scored[1]?.agreement ?? 0) >= 0.2) return scored[0];
      console.warn(`  concordância insuficiente: ${scored.map((item) => Math.round(item.agreement * 100)).join("% / ")}%`);
      return null;
    } catch (error) {
      console.warn(`  versão (${model}): ${error instanceof Error ? error.message.slice(0, 120) : error}`);
    }
  }
  return null;
}

async function main() {
  const dir = arg("dir");
  const jsonDir = arg("json");
  if (!dir || !jsonDir) throw new Error("Use --dir <PDFs> --json <transcrições>.");
  // ETEC e FATEC têm ano e semestre por código; nas outras provas (UNESP, FUVEST, UNICAMP) o código é o ano.
  const examSlug = (arg("exam") ?? "etec") as keyof typeof VESTIBULAR_SOURCES;
  if (!VESTIBULAR_SOURCES[examSlug]) throw new Error(`Exame sem fonte cadastrada: ${examSlug}.`);
  const editions = examSlug === "etec" || examSlug === "fatec" ? CPS_EXAMS[examSlug].editions : null;
  const batch = arg("batch") ?? (examSlug === "etec" ? "etec-vestibulinho" : `${examSlug}-vestibular`);

  await ensureCatalog();
  const prisma = getPrisma();
  const supabase = createSupabaseAdminClient();
  if (!(await supabase.storage.getBucket(BUCKET)).data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    if (error) throw error;
  }
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: examSlug } });
  const subjects = new Map((await prisma.bankSubject.findMany({ select: { id: true, slug: true, area: true } })).map((item) => [item.slug, item]));
  const base = VESTIBULAR_SOURCES[examSlug];
  // FUVEST e UNICAMP também vieram do BLUEX; aqui o texto é transcrito do PDF da prova.
  const source = { ...base, license: base.license.replace(/ Transcrição: .*$/, " Transcrição do PDF da prova (acervo público github.com/diogopelaes/provas-vestibulares).") };
  const total = { imported: 0, existing: 0, rejected: {} as Record<string, number> };
  const reject = (reason: string) => (total.rejected[reason] = (total.rejected[reason] ?? 0) + 1);

  for (const file of fs.readdirSync(jsonDir).filter((name) => name.endsWith(".json")).sort()) {
    const code = file.replace(".json", "");
    const info = editions ? editions[code] : Number(code) > 1990 ? { year: Number(code), semester: 0 as const } : null;
    if (!info) {
      console.warn(`Caderno ${code} sem ano/semestre cadastrado em CPS_EXAMS; pulando.`);
      continue;
    }
    const edition = info.semester ? etecEdition(info.semester) : "";
    const questions = JSON.parse(fs.readFileSync(path.join(jsonDir, file), "utf8")) as Extracted[];
    const keyText = (await new PDFParse({ data: fs.readFileSync(path.join(dir, `${code}-gabarito.pdf`)) }).getText()).text;
    const key = parseAnswerKey(keyText);
    let answers = new Map([...key].flatMap(([number, entry]) => (entry.answer ? [[number, entry.answer] as const] : [])));
    // Gabarito com várias versões da prova: fica a versão que mais concorda com a resolução da IA.
    const versions = parseKeyVersions(keyText);
    if (versions.length > 1 || (versions.length === 1 && answers.size < 20)) {
      const chosen = versions.length === 1 ? { key: versions[0], agreement: 1 } : await chooseVersion(questions, versions);
      if (!chosen) {
        console.warn(`Caderno ${code}: nenhuma versão do gabarito bate com o caderno; pulando.`);
        continue;
      }
      console.log(`Caderno ${code}: versão do gabarito escolhida (${Math.round(chosen.agreement * 100)}% de concordância)`);
      answers = chosen.key;
    }

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
    // Matéria: a do gabarito oficial (a FATEC traz a disciplina); o resto (ETEC, "Multidisciplinar") a IA classifica.
    const fromKey = new Map(
      fresh.flatMap((question) => {
        const slug = disciplineToSubject(key.get(question.number)?.discipline ?? null);
        return slug ? [[question.number, slug] as const] : [];
      }),
    );
    const toClassify = fresh.filter((question) => !fromKey.has(question.number));
    const subjectOf = new Map([...(toClassify.length ? await classify(toClassify) : new Map<number, string>()), ...fromKey]);

    const upload = async (figure: Figure, name: string) => {
      const page = rendered.get(figure.page);
      if (!page || figure.box?.length !== 4) return null;
      const image = await crop(page, figure.box);
      if (!image) return null;
      const target = `vestibular/${examSlug}/${code}/${name}.webp`;
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
      // 5 alternativas (A a E) ou 4 (A a D, UNICAMP).
      const labels = LABELS.slice(0, (question.options ?? []).length === 4 || question.optionFigures?.length === 4 ? 4 : 5);
      const optionFigures = question.optionFigures?.length === labels.length ? question.optionFigures : [];
      if ((question.options ?? []).length !== labels.length && !optionFigures.length) {
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
      for (const [index, label] of labels.entries()) {
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
    console.log(`${examSlug.toUpperCase()} ${info.year} (${edition}): ${importedHere} importadas`);
  }

  console.log("\nResumo:", JSON.stringify(total, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
