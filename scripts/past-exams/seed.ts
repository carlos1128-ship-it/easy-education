import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
loadEnvConfig(process.cwd());
import { getPrisma } from "../../src/lib/prisma";
import { createSupabaseAdminClient } from "../../src/lib/supabase/admin";
import {
  EXAM_SOURCES,
  PRIORITY_BOOKLETS,
} from "../../src/lib/past-exams/sources";
import {
  DEMO_ID,
  DEMO_QUESTIONS,
  demoItems,
} from "../../src/lib/past-exams/demo";
import { documentSchema, itemSchema } from "../../src/lib/past-exams/domain";
import { saveDraft } from "../../src/lib/past-exams/service";

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const number of [1, 2]) {
    const page = doc.addPage([595, 842]);
    page.drawRectangle({
      x: 0,
      y: 770,
      width: 595,
      height: 72,
      color: rgb(0.13, 0.32, 0.78),
    });
    page.drawText("EASY EDUCATION", {
      x: 40,
      y: 805,
      size: 18,
      font: bold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Caderno autoral de demonstracao | Sem vinculo com bancas", {
      x: 40,
      y: 784,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });
    let y = 735;
    for (const q of DEMO_QUESTIONS.filter((q) => q.page === number)) {
      page.drawText(
        `${q.number}. ${q.subject.normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`,
        { x: 40, y, size: 12, font: bold },
      );
      y -= 25;
      const words = q.prompt.split(" ");
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, 11) > 510) {
          page.drawText(line, { x: 40, y, size: 11, font });
          y -= 17;
          line = word;
        } else line = next;
      }
      if (line) {
        page.drawText(line, { x: 40, y, size: 11, font });
        y -= 22;
      }
      for (const option of q.choices) {
        page.drawText(option, { x: 50, y, size: 11, font });
        y -= 19;
      }
      y -= 28;
    }
    page.drawText(
      `Material original para teste do cartao-resposta. Pagina ${number}/2`,
      { x: 40, y: 25, size: 9, font, color: rgb(0.35, 0.35, 0.35) },
    );
  }
  return doc.save();
}
async function main() {
  const pdf = await makePdf();
  await mkdir("public/assets/exams", { recursive: true });
  await writeFile("public/assets/exams/demo-autoral.pdf", pdf);
  if (!process.argv.includes("--apply")) {
    console.log(
      "PDF autoral gerado. Use --apply para cadastrar fontes e demonstração no banco configurado.",
    );
    return;
  }
  const prisma = getPrisma();
  for (const source of EXAM_SOURCES)
    await prisma.examInstitution.upsert({
      where: { slug: source.slug },
      create: source,
      update: {},
    });
  for (const source of PRIORITY_BOOKLETS) {
    const institution = await prisma.examInstitution.findUniqueOrThrow({
      where: { slug: source.slug },
    });
    if (
      await prisma.pastExam.findFirst({
        where: { institutionId: institution.id, title: source.title },
      })
    )
      continue;
    const { slug, sourceUrl, keyUrl, format, ...metadata } = source;
    void slug;
    const created = await saveDraft(
      {
        ...metadata,
        institutionId: institution.id,
        edition: "Regular",
        firstNumber: 1,
        allowPause: true,
        document: documentSchema.parse({ sourceUrl }),
        keyDocument: documentSchema.parse({ sourceUrl: keyUrl }),
        items: Array.from({ length: source.questionCount }, (_, i) =>
          itemSchema.parse({
            number: i + 1,
            format,
            subject: "A classificar",
            sourceUrl,
            correct: "",
            explanation: "",
          }),
        ),
      },
      "catalog-seed",
    );
    await prisma.pastExam.update({
      where: { id: created.id },
      data: { status: "catalogued" },
    });
  }
  const institution = await prisma.examInstitution.upsert({
    where: { slug: "easy-education" },
    create: {
      slug: "easy-education",
      name: "Easy Education · Autoral",
      sourceNotes:
        "Apenas questões próprias de demonstração; não são questões oficiais.",
    },
    update: {},
  });
  const configuredBase = process.env.NEXT_PUBLIC_APP_URL;
  const base = configuredBase?.startsWith("https://")
    ? configuredBase
    : "https://easy-education-tau.vercel.app";
  const sourceUrl = new URL("/assets/exams/demo-autoral.pdf", base).toString();
  if (!(await prisma.pastExam.findUnique({ where: { id: DEMO_ID } }))) {
    const created = await saveDraft(
      {
        institutionId: institution.id,
        title: "Cartão-resposta · Demonstração autoral",
        year: 2026,
        phase: "Treino",
        edition: "Autoral",
        booklet: "Demonstração 01",
        day: "",
        language: "",
        questionCount: 6,
        firstNumber: 1,
        durationMinutes: 30,
        allowPause: true,
        document: documentSchema.parse({
          sourceUrl,
          rightsStatus: "permitted",
          commercialUseAllowed: true,
          reproductionAllowed: true,
          derivativesAllowed: true,
          licenseDocument:
            "Conteúdo e PDF originais criados para Easy Education. Fonte: src/lib/past-exams/demo.ts e scripts/past-exams/seed.ts. Não reproduz provas de terceiros.",
          attributionRequired:
            "Easy Education · Caderno autoral de demonstração",
        }),
        keyDocument: documentSchema.parse({ sourceUrl }),
        items: demoItems(sourceUrl),
      },
      "authored-test-fixture",
    );
    // The fixture is explicitly non-official. Official/imported keys remain drafts.
    await prisma.$transaction(async (tx) => {
      await tx.pastExam.update({
        where: { id: created.id },
        data: {
          id: DEMO_ID,
          isDemo: true,
          status: "published",
          publishedKeyId: created.keyId,
        },
      });
      await tx.examAnswerKey.update({
        where: { id: created.keyId },
        data: {
          status: "reviewed",
          reviewedBy: "authored-test-fixture",
          reviewedAt: new Date(),
        },
      });
    });
  }
  const storage = createSupabaseAdminClient().storage;
  const bucket = await storage.getBucket("exam-documents");
  if (bucket.error) {
    const created = await storage.createBucket("exam-documents", {
      public: false,
      fileSizeLimit: 25_000_000,
      allowedMimeTypes: ["application/pdf"],
    });
    if (created.error) throw created.error;
  } else if (bucket.data.public)
    throw new Error("Bucket de provas deve ser privado.");
  const document = await prisma.examDocument.findUniqueOrThrow({
    where: { examId_kind: { examId: DEMO_ID, kind: "exam" } },
  });
  if (!document.storagePath) {
    const path = `${document.id}/demo-autoral.pdf`;
    const uploaded = await storage
      .from("exam-documents")
      .upload(path, pdf, { contentType: "application/pdf", upsert: false });
    if (uploaded.error && !uploaded.error.message.includes("already exists"))
      throw uploaded.error;
    await prisma.examDocument.update({
      where: { id: document.id },
      data: { storagePath: path, pageCount: 2 },
    });
  }
  console.log(
    JSON.stringify({
      institutions: EXAM_SOURCES.length,
      officialDrafts: PRIORITY_BOOKLETS.length,
      demoId: DEMO_ID,
      aiCalls: 0,
    }),
  );
  await prisma.$disconnect();
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha no cadastro.");
  process.exitCode = 1;
});
