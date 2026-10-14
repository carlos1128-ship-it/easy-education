import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { getPrisma } from "@/lib/prisma";
import { examSchema } from "@/lib/past-exams/domain";
import { publishExam, saveDraft } from "@/lib/past-exams/service";
import { examError, readJson } from "@/lib/past-exams/http";

export async function GET() {
  try {
    const { response } = await requireAdminApi();
    if (response) return response;
    const prisma = getPrisma();
    const institutions = await prisma.examInstitution.findMany({
      orderBy: { name: "asc" },
    });
    const exams = await prisma.pastExam.findMany({
      orderBy: { updatedAt: "desc" },
      take: 250,
      include: {
        documents: true,
        keys: { orderBy: { revision: "desc" }, take: 1 },
        institution: true,
      },
    });
    return NextResponse.json(
      { institutions, exams },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return examError(error);
  }
}
export async function POST(request: Request) {
  try {
    const { user, response } = await requireAdminApi();
    if (response) return response;
    const input = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("save"),
          id: z.string().uuid().optional(),
          version: z.number().int().nonnegative().optional(),
          exam: examSchema,
        }),
        z.object({
          action: z.literal("publish"),
          id: z.string().uuid(),
          keyId: z.string().uuid(),
          version: z.number().int().nonnegative(),
          confirm: z.boolean(),
        }),
        z.object({
          action: z.literal("unpublish"),
          id: z.string().uuid(),
          version: z.number().int().nonnegative(),
        }),
      ])
      .parse(await readJson(request));
    if (input.action === "save")
      return NextResponse.json(
        await saveDraft(input.exam, user.id, input.id, input.version),
      );
    if (input.action === "publish")
      return NextResponse.json(
        await publishExam(
          input.id,
          input.keyId,
          input.version,
          user.id,
          input.confirm,
        ),
      );
    const changed = await getPrisma().pastExam.updateMany({
      where: { id: input.id, version: input.version },
      data: {
        status: "draft",
        publishedKeyId: null,
        version: { increment: 1 },
      },
    });
    return NextResponse.json(
      { ok: !!changed.count },
      { status: changed.count ? 200 : 409 },
    );
  } catch (error) {
    return examError(error);
  }
}
