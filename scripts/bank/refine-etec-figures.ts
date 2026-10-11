/**
 * Passo 3 (opcional) da importação do Vestibulinho ETEC: refina o recorte das figuras. A caixa que vem da
 * transcrição é aproximada e às vezes pega texto vizinho; aqui a página é renderizada de novo, a região é
 * ampliada e a IA aponta a caixa exata da figura dentro dela. A imagem nova entra com outro nome (-r) e as
 * questões passam a apontar para ela.
 *
 *   npx tsx --env-file=.env.local scripts/bank/refine-etec-figures.ts --dir ./etec --json ./etec/json
 */
import fs from "node:fs";
import path from "node:path";
import { Type } from "@google/genai";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { CPS_EXAMS, etecEdition } from "@/lib/bank/etec";
import { getGemini } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "questoes";
type Figure = { page: number; box: number[] };
type Extracted = { number: number; figures: Figure[]; optionFigures: Figure[] };

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

function region(width: number, height: number, box: number[], grow: number) {
  const [y0, x0, y1, x1] = box;
  const left = Math.max(0, Math.floor(((x0 - grow) / 1000) * width));
  const top = Math.max(0, Math.floor(((y0 - grow) / 1000) * height));
  const right = Math.min(width, Math.ceil(((x1 + grow) / 1000) * width));
  const bottom = Math.min(height, Math.ceil(((y1 + grow) / 1000) * height));
  return { left, top, width: right - left, height: bottom - top };
}

async function tightBox(image: Buffer) {
  for (const model of ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"]) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/png", data: image.toString("base64") } },
              {
                text: "Este é um recorte de uma página de prova. Dê a caixa [ymin, xmin, ymax, xmax] (0 a 1000, relativa a este recorte) que contém SÓ a figura principal (imagem, gráfico, mapa, tirinha, tabela desenhada ou esquema), com a legenda/fonte dela se estiver colada à figura. Deixe de fora o texto corrido da questão, enunciados, títulos como 'Questão 05' e pedaços de outras questões.",
              },
            ],
          },
        ],
        config: { temperature: 0, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { box: { type: Type.ARRAY, items: { type: Type.INTEGER } } }, required: ["box"] } },
      });
      const box = (JSON.parse(response.text ?? "{}") as { box?: number[] }).box;
      if (box?.length === 4 && box[2] > box[0] && box[3] > box[1]) return box;
    } catch (error) {
      console.warn(`  ${model}: ${error instanceof Error ? error.message.slice(0, 120) : error}`);
    }
  }
  return null;
}

async function main() {
  const dir = arg("dir");
  const jsonDir = arg("json");
  if (!dir || !jsonDir) throw new Error("Use --dir <PDFs> --json <transcrições>.");
  const prisma = getPrisma();
  const supabase = createSupabaseAdminClient();
  const examSlug = arg("exam") ?? "etec";
  const editions = examSlug === "etec" || examSlug === "fatec" ? CPS_EXAMS[examSlug].editions : null;
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: examSlug } });
  let refined = 0;

  for (const file of fs.readdirSync(jsonDir).filter((name) => name.endsWith(".json")).sort()) {
    const code = file.replace(".json", "");
    const info = editions ? editions[code] : Number(code) > 1990 ? { year: Number(code), semester: 0 as const } : null;
    if (!info) continue;
    const questions = (JSON.parse(fs.readFileSync(path.join(jsonDir, file), "utf8")) as Extracted[]).filter((question) => question.figures?.length || question.optionFigures?.length === 5);
    if (!questions.length) continue;
    const pages = [...new Set(questions.flatMap((question) => [...question.figures, ...question.optionFigures].map((figure) => figure.page)))];
    const shots = await new PDFParse({ data: fs.readFileSync(path.join(dir, `${code}-prova.pdf`)) }).getScreenshot({ partial: pages, scale: 2.5 });
    const rendered = new Map(shots.pages.map((shot) => [shot.pageNumber, Buffer.from(shot.data)]));

    for (const question of questions) {
      const row = await prisma.bankQuestion.findUnique({
        where: { examId_year_edition_number_variant_origin_ownerUserId: { examId: exam.id, year: info.year, edition: info.semester ? etecEdition(info.semester) : "", number: question.number, variant: "", origin: "prova_oficial", ownerUserId: "" } },
      });
      if (!row) continue;
      let supportText = row.supportText ?? "";
      let images = (row.images as string[] | null) ?? [];

      for (const [index, figure] of question.figures.entries()) {
        const page = rendered.get(figure.page);
        if (!page) continue;
        const meta = await sharp(page).metadata();
        const outer = region(meta.width ?? 0, meta.height ?? 0, figure.box, 25);
        if (outer.width < 20 || outer.height < 20) continue;
        const wide = await sharp(page).extract(outer).png().toBuffer();
        const inner = await tightBox(wide);
        if (!inner) continue;
        const tight = region(outer.width, outer.height, inner, 6);
        if (tight.width < 30 || tight.height < 30) continue;
        const image = await sharp(wide).extract(tight).flatten({ background: "#ffffff" }).webp({ quality: 86 }).toBuffer();
        const target = `vestibular/${examSlug}/${code}/${question.number}-${index}-r.webp`;
        const { error } = await supabase.storage.from(BUCKET).upload(target, image, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
        if (error) throw error;
        const oldUrl = supabase.storage.from(BUCKET).getPublicUrl(`vestibular/${examSlug}/${code}/${question.number}-${index}.webp`).data.publicUrl;
        const newUrl = supabase.storage.from(BUCKET).getPublicUrl(target).data.publicUrl;
        supportText = supportText.split(oldUrl).join(newUrl);
        images = images.map((url) => (url === oldUrl ? newUrl : url));
        refined += 1;
      }
      await prisma.bankQuestion.update({ where: { id: row.id }, data: { supportText, images } });
    }
    console.log(`Caderno ${code}: ${refined} figuras refinadas até agora`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
