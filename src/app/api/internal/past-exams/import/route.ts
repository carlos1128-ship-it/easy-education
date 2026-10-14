import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { canReproduce, ExamError } from "@/lib/past-exams/domain";
import { examError } from "@/lib/past-exams/http";
import { importKeyFile } from "@/lib/past-exams/import-key";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { response } = await requireAdminApi();
    if (response) return response;
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new ExamError("Origem não permitida.", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 3_100_000)
      throw new ExamError("Máximo de 3 MB.", 413);
    const data = await request.formData(),
      file = data.get("file");
    if (!(file instanceof File)) throw new ExamError("Arquivo ausente.");
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const doc = await getPrisma().examDocument.findFirst({
        where: { examId: String(data.get("examId")), kind: "key" },
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
          "Registre e salve a autorização do PDF do gabarito antes de importá-lo.",
          403,
        );
    }
    return NextResponse.json({
      ...(await importKeyFile(file)),
      requiresHumanReview: true,
    });
  } catch (error) {
    return examError(error);
  }
}
