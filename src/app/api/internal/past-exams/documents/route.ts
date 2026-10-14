import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReproduce, ExamError } from "@/lib/past-exams/domain";
import { examError, readJson } from "@/lib/past-exams/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { response } = await requireAdminApi();
    if (response) return response;
    const input = z
      .object({
        documentId: z.string().uuid(),
        action: z.enum(["upload", "complete"]),
        path: z.string().max(300).optional(),
      })
      .parse(await readJson(request));
    const prisma = getPrisma();
    const doc = await prisma.examDocument.findUnique({
      where: { id: input.documentId },
    });
    if (
      !doc ||
      !canReproduce({
        ...doc,
        rightsStatus: doc.rightsStatus as "pending",
        licenseDocument: doc.licenseDocument ?? "",
        attributionRequired: doc.attributionRequired ?? "",
      })
    )
      throw new ExamError(
        "Aguardando autorização comercial e de reprodução.",
        403,
      );
    const storage = createSupabaseAdminClient().storage.from("exam-documents");
    if (
      doc.storagePath &&
      (await prisma.examAttempt.count({ where: { examId: doc.examId } }))
    )
      throw new ExamError(
        "Este PDF já foi usado em tentativas. Cadastre outro caderno para substituí-lo.",
        409,
      );
    if (input.action === "upload") {
      const path = `${doc.id}/${randomUUID()}.pdf`;
      const { data, error } = await storage.createSignedUploadUrl(path);
      if (error || !data)
        throw new ExamError("Armazenamento privado indisponível.", 503);
      return NextResponse.json({ path, signedUrl: data.signedUrl });
    }
    if (
      !input.path ||
      !new RegExp(`^${doc.id}/[a-f0-9-]{36}\\.pdf$`).test(input.path)
    )
      throw new ExamError("Arquivo inválido.");
    const { data: info, error: infoError } = await storage.info(input.path);
    if (infoError || !info || Number(info.metadata?.size) > 25_000_000)
      throw new ExamError("PDF ausente ou maior que 25 MB.");
    const { data: blob, error } = await storage.download(input.path);
    if (error || !blob || blob.size > 25_000_000)
      throw new ExamError("Não foi possível validar o PDF.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
      throw new ExamError("O arquivo não é um PDF.");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    let pages = 0;
    try {
      pages = (await parser.getInfo()).total;
    } finally {
      await parser.destroy();
    }
    if (pages < 1 || pages > 500)
      throw new ExamError("PDF deve ter entre 1 e 500 páginas.");
    const changed = await prisma.examDocument.updateMany({
      where: {
        id: doc.id,
        licenseId: doc.licenseId,
        rightsStatus: "permitted",
        commercialUseAllowed: true,
        reproductionAllowed: true,
        sourceUrl: doc.sourceUrl,
      },
      data: { storagePath: input.path, pageCount: pages },
    });
    if (!changed.count)
      throw new ExamError("A licença mudou. Revalide o documento.", 409);
    return NextResponse.json({ ok: true, pages });
  } catch (error) {
    return examError(error);
  }
}
