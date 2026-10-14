import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PRIORITY_BOOKLETS } from "../../src/lib/past-exams/sources";
import { fetchPublicExamPdf, isPublicExamPdf } from "../../src/lib/past-exams/public-document";

async function main() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  await mkdir("public/exam-covers", { recursive: true });
  const manifest: Record<string, { cover: string; pages: number }> = {};
  for (const source of PRIORITY_BOOKLETS) {
    if (!isPublicExamPdf(source.sourceUrl)) continue;
    try {
      const bytes = await fetchPublicExamPdf(source.sourceUrl);
      const pdf = await getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 260 / page.getViewport({ scale: 1 }).width });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvas: canvas as never, canvasContext: canvas.getContext("2d") as never, viewport }).promise;
      const file = `${source.slug}-${source.year}-${createHash("sha256").update(source.sourceUrl).digest("hex").slice(0, 10)}.webp`;
      await writeFile(`public/exam-covers/${file}`, canvas.toBuffer("image/webp", 85));
      manifest[source.sourceUrl] = { cover: `/exam-covers/${file}`, pages: pdf.numPages };
      console.log(`${source.title}: ${pdf.numPages} páginas, capa pronta`);
      await pdf.destroy();
    } catch (error) { console.error(`${source.title}: ${error instanceof Error ? error.message : error}`); }
  }
  await writeFile("src/lib/past-exams/covers.json", JSON.stringify(manifest, null, 2) + "\n");
}
void main();
