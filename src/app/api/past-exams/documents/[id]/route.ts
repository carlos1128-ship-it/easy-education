import { fetchPublicExamPdf, isPublicExamPdf } from "@/lib/past-exams/public-document";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireTier } from "@/lib/usage";
import { isAdminEmail } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReproduce, ExamError } from "@/lib/past-exams/domain";
import { examError } from "@/lib/past-exams/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await requireTier(user);
    const doc = await getPrisma().examDocument.findUnique({
      where: { id: (await context.params).id },
      include: {
        exam: {
          select: {
            status: true,
            attempts: {
              where: { userId: user.id },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (
      !doc ||
      !(["exam", "key"].includes(doc.kind)) ||
      (!isAdminEmail(user.email) &&
        !["published", "catalogued"].includes(doc.exam.status) &&
        !doc.exam.attempts.length)
    )
      throw new ExamError("Documento não encontrado.", 404);
    if (isPublicExamPdf(doc.sourceUrl)) {
      if (new URL(request.url).searchParams.has("file")) {
        const bytes = await fetchPublicExamPdf(doc.sourceUrl);
        return new Response(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${new URL(request.url).searchParams.has("download") ? "attachment" : "inline"}; filename="prova-${doc.id}.pdf"`,
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return NextResponse.json({ url: `/api/past-exams/documents/${doc.id}?file=1` }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (
      !doc.storagePath ||
      !canReproduce({
        ...doc,
        rightsStatus: doc.rightsStatus as "pending",
        licenseDocument: doc.licenseDocument ?? "",
        attributionRequired: doc.attributionRequired ?? "",
      })
    )
      throw new ExamError("Consulte o documento na fonte oficial.", 403);
    const { data, error } = await createSupabaseAdminClient()
      .storage.from("exam-documents")
      .createSignedUrl(doc.storagePath, 60);
    if (error || !data)
      throw new ExamError("Documento temporariamente indisponível.", 503);
    return NextResponse.json(
      { url: data.signedUrl },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return examError(error);
  }
}
