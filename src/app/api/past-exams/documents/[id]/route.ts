import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireTier } from "@/lib/usage";
import { isAdminEmail } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canReproduce, ExamError } from "@/lib/past-exams/domain";
import { examError } from "@/lib/past-exams/http";
export async function GET(
  _request: Request,
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
      doc.kind !== "exam" ||
      (!isAdminEmail(user.email) &&
        doc.exam.status !== "published" &&
        !doc.exam.attempts.length)
    )
      throw new ExamError("Documento não encontrado.", 404);
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
