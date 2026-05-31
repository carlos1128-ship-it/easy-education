import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const schema = z.object({
  subject: z.string().min(2),
  durationMinutes: z.number().min(1).max(600),
  method: z.string().min(2),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const payload = schema.parse(await request.json());
  const session = await getPrisma().studySession.create({
    data: {
      userId: user.id,
      subject: payload.subject,
      durationMinutes: payload.durationMinutes,
      method: payload.method,
      notes: payload.notes,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plano");
  revalidatePath("/dashboard/desempenho");

  return NextResponse.json({ session });
}
