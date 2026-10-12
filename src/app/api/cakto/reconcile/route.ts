import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { retryCaktoDeliveries } from "@/lib/cakto-inbox";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }
  return NextResponse.json({ retried: await retryCaktoDeliveries() });
}
