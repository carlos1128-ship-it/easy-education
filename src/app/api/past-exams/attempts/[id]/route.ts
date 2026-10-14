import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireTier } from "@/lib/usage";
import { getAttempt, updateAttempt } from "@/lib/past-exams/service";
import { examError, readJson } from "@/lib/past-exams/http";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await requireTier(user);
    return NextResponse.json(
      await getAttempt((await context.params).id, user.id),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return examError(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await requireTier(user);
    const input = z
      .object({
        version: z.number().int().nonnegative(),
        action: z.enum(["save", "pause", "resume", "finish"]),
        answers: z
          .array(
            z.object({
              number: z.number().int().positive(),
              value: z.string().max(16000),
              reviewed: z.boolean(),
            }),
          )
          .max(300)
          .default([]),
      })
      .parse(await readJson(request));
    return NextResponse.json(
      await updateAttempt(
        (await context.params).id,
        user.id,
        input.version,
        input.action,
        input.answers,
      ),
    );
  } catch (error) {
    return examError(error);
  }
}
