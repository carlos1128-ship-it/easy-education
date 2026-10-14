import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireTier } from "@/lib/usage";
import { startAttempt } from "@/lib/past-exams/service";
import { examError, readJson } from "@/lib/past-exams/http";
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await requireTier(user);
    const input = z
      .object({ examId: z.string().uuid(), requestId: z.string().uuid() })
      .parse(await readJson(request));
    return NextResponse.json(
      await startAttempt(input.examId, user.id, input.requestId),
    );
  } catch (error) {
    return examError(error);
  }
}
