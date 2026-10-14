import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { getPrisma } from "../../src/lib/prisma";
import { EXAM_SOURCES, PRIORITY_BOOKLETS } from "../../src/lib/past-exams/sources";
import { documentSchema, itemSchema } from "../../src/lib/past-exams/domain";
import { saveDraft } from "../../src/lib/past-exams/service";

/** Apenas metadados e links oficiais. Não baixa, copia ou publica gabaritos sem revisão humana. */
async function main() {
  const apply = process.argv.includes("--apply");
  const db = getPrisma();
  try {
    if (!apply) { console.log(JSON.stringify({ institutions: EXAM_SOURCES.length, booklets: PRIORITY_BOOKLETS.length, downloads: 0 })); return; }
    for (const source of EXAM_SOURCES) await db.examInstitution.upsert({ where: { slug: source.slug }, create: source, update: { archiveUrl: source.archiveUrl, sourceNotes: source.sourceNotes } });
    for (const source of PRIORITY_BOOKLETS) {
      const institution = await db.examInstitution.findUniqueOrThrow({ where: { slug: source.slug } });
      const existing = await db.pastExam.findFirst({ where: { institutionId: institution.id, title: source.title } });
      if (existing) {
        if (existing.status === "catalogued") {
          for (const [kind, sourceUrl] of [["exam", source.sourceUrl], ["key", source.keyUrl]]) await db.examDocument.updateMany({ where: { examId: existing.id, kind, storagePath: null }, data: { sourceUrl } });
        }
        continue;
      }
      const { slug, sourceUrl, keyUrl, format, ...metadata } = source;
      void slug;
      const draft = await saveDraft({ ...metadata, institutionId: institution.id, edition: "Regular", firstNumber: 1, allowPause: true,
        document: documentSchema.parse({ sourceUrl }), keyDocument: documentSchema.parse({ sourceUrl: keyUrl }),
        items: Array.from({ length: source.questionCount }, (_, i) => itemSchema.parse({ number: i + 1, format, subject: "Conhecimentos gerais", sourceUrl })),
      }, "official-catalog-links");
      await db.pastExam.update({ where: { id: draft.id }, data: { status: "catalogued" } });
    }
    console.log(JSON.stringify({ institutions: EXAM_SOURCES.length, booklets: PRIORITY_BOOKLETS.length, downloads: 0 }));
  } finally { await db.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Falha ao sincronizar catálogo."); process.exitCode = 1; });
