/**
 * Importa as provas da FUVEST (USP) e da UNICAMP (Comvest) para o banco, a partir do conjunto acadêmico BLUEX
 * (https://github.com/Portuguese-Benchmark-Datasets/BLUEX), que transcreve as provas oficiais da 1ª fase.
 * Fonte, licença e ressalvas: docs/fontes-questoes.md.
 *
 *   git clone --depth 1 https://github.com/Portuguese-Benchmark-Datasets/BLUEX.git && unzip BLUEX/data/bluex_dataset.zip -d bluex
 *   npx tsx --env-file=.env.local scripts/bank/import-vestibular.ts --dir ./bluex --publish
 *   npx tsx --env-file=.env.local scripts/bank/import-vestibular.ts --dir ./bluex --exam fuvest --years 2023,2024
 *
 * - As imagens são copiadas para o bucket público "questoes" do Supabase (o app não depende de site de terceiros).
 * - Questão anulada, incompleta ou com imagem faltando NÃO entra (fica no relatório).
 * - Com --publish: publica com o gabarito oficial; a matéria vem da própria fonte.
 * - Pode rodar de novo: o que já existe é ignorado.
 */
import fs from "node:fs";
import path from "node:path";
import { VESTIBULAR_SOURCES } from "@/lib/bank/constants";
import { ensureCatalog } from "@/lib/bank/service";
import { normalizeBluexQuestion, type BluexQuestion } from "@/lib/bank/vestibular";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "questoes";
const EXAMS = { USP: "fuvest", UNICAMP: "unicamp" } as const;

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function ensureBucket() {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
    if (error) throw error;
  }
  return supabase;
}

async function main() {
  const dir = arg("dir");
  if (!dir) throw new Error("Use --dir <pasta do BLUEX descompactado> (com questions/ e imgs/).");
  const onlyExam = arg("exam");
  const years = (arg("years") ?? "").split(",").map(Number).filter(Boolean);
  const batch = arg("batch") ?? "vestibulares-bluex";

  await ensureCatalog();
  const prisma = getPrisma();
  const supabase = await ensureBucket();
  const subjects = new Map((await prisma.bankSubject.findMany({ select: { id: true, slug: true } })).map((item) => [item.slug, item.id]));

  const report: Record<string, { imported: number; existing: number; rejected: Record<string, number> }> = {};

  for (const [folder, slug] of Object.entries(EXAMS)) {
    if (onlyExam && onlyExam !== slug) continue;
    const exam = await prisma.exam.findUniqueOrThrow({ where: { slug } });
    const source = VESTIBULAR_SOURCES[slug];
    const stats = (report[slug] = { imported: 0, existing: 0, rejected: {} as Record<string, number> });
    const root = path.join(dir, "questions", folder);

    for (const yearDir of fs.readdirSync(root).sort()) {
      if (years.length && !years.includes(Number(yearDir))) continue;
      const files = fs.readdirSync(path.join(root, yearDir)).filter((file) => file.endsWith(".json"));
      for (const file of files) {
        const raw = JSON.parse(fs.readFileSync(path.join(root, yearDir, file), "utf8")) as BluexQuestion;
        const publicUrl = (index: number) => {
          const relative = raw.associated_images[index];
          return relative ? supabase.storage.from(BUCKET).getPublicUrl(`vestibular/${slug}/${relative.split("/").slice(2).join("/")}`).data.publicUrl : "";
        };
        const result = normalizeBluexQuestion(raw, publicUrl);
        if (!result.ok) {
          stats.rejected[result.reason] = (stats.rejected[result.reason] ?? 0) + 1;
          continue;
        }
        const question = result.question;
        const where = { examId_year_edition_number_variant_origin_ownerUserId: { examId: exam.id, year: question.year, edition: "", number: question.number, variant: "", origin: "prova_oficial", ownerUserId: "" } };
        if (await prisma.bankQuestion.findUnique({ where, select: { id: true } })) {
          stats.existing += 1;
          continue;
        }

        // Copia as imagens antes de gravar a questão (sem imagem, ela não seria resolvível).
        let uploadFailed = false;
        for (const relative of raw.associated_images) {
          const target = `vestibular/${slug}/${relative.split("/").slice(2).join("/")}`;
          const body = fs.readFileSync(path.join(dir, relative));
          const { error } = await supabase.storage.from(BUCKET).upload(target, body, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
          if (error) {
            console.error(`Falha ao enviar ${target}: ${error.message}`);
            uploadFailed = true;
            break;
          }
        }
        if (uploadFailed) {
          stats.rejected["falha ao copiar imagem"] = (stats.rejected["falha ao copiar imagem"] ?? 0) + 1;
          continue;
        }

        // A fonte tem alguns números repetidos na mesma prova: a primeira ocorrência fica, a outra é ignorada.
        const created = await prisma.bankQuestion.create({
          data: {
            examId: exam.id,
            year: question.year,
            number: question.number,
            area: question.area || null,
            subjectId: result.subjectSlug ? (subjects.get(result.subjectSlug) ?? null) : null,
            statement: question.statement,
            supportText: question.supportText,
            images: question.images,
            options: question.options,
            correctLabel: question.correctLabel,
            origin: "prova_oficial",
            sourceName: source.name,
            sourceUrl: source.url,
            license: source.license,
            isPublished: flag("publish"),
            importBatch: batch,
          },
        }).catch((error: { code?: string }) => {
          if (error.code === "P2002") return null;
          throw error;
        });
        if (created) stats.imported += 1;
        else stats.rejected["número repetido na fonte"] = (stats.rejected["número repetido na fonte"] ?? 0) + 1;
      }
      console.log(`${slug} ${yearDir}: ${stats.imported} importadas até agora`);
    }
  }

  console.log("\nResumo:", JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
