import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "../../src/lib/supabase/admin";
import { getPrisma } from "../../src/lib/prisma";
import { getStripe } from "../../src/lib/stripe";

const db = getPrisma();
const statePath = join(tmpdir(), "easy-education-release-smoke.json");
const base = process.env.QA_ORIGIN ?? "http://localhost:3000";
type State = { id: string; email: string; password: string; parentUrl?: string; checkoutUrl?: string; sessionId?: string; quizId?: string };
async function state() { return JSON.parse(await readFile(statePath, "utf8")) as State; }
async function cookie(user: State) {
  const values = new Map<string, string>();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => [...values].map(([name, value]) => ({ name, value })), setAll: (items) => { for (const item of items) values.set(item.name, item.value); } } });
  const signed = await auth.auth.signInWithPassword({ email: user.email, password: user.password });
  if (signed.error) throw signed.error;
  return [...values].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function request(path: string, method: string, body: unknown, cookies?: string) {
  const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Origin: base, ...(cookies ? { Cookie: cookies } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: "manual", signal: AbortSignal.timeout(120_000) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 100) }; }
  return { status: response.status, data };
}
async function provision() {
  try { await readFile(statePath); throw new Error("A conta de teste já existe; execute cleanup antes."); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const email = `easy-release-${Date.now()}@example.com`, password = `EeTeste!${randomUUID()}`;
  const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Aluno de teste" } });
  if (error || !data.user) throw error ?? new Error("Conta não criada.");
  const fixture = { id: data.user.id, email, password };
  await writeFile(statePath, JSON.stringify(fixture));
  await db.profile.upsert({ where: { userId: fixture.id }, create: { userId: fixture.id, email, name: "Aluno de teste", studyGoal: "Faculdade", onboardingDone: true }, update: {} });
  console.log(JSON.stringify({ email, password, userId: fixture.id, origin: base }));
}
async function parent() {
  const fixture = await state(), cookies = await cookie(fixture);
  assert.equal((await request("/api/billing/parent-request", "POST", { plan: "full" })).status, 401);
  const status = await request("/api/billing/status", "GET", undefined, cookies);
  assert.equal(status.data.hasAccess, false);
  const created = await request("/api/billing/parent-request", "POST", { plan: "full" }, cookies);
  assert.equal(created.status, 200, JSON.stringify(created));
  assert.ok(!created.data.url.includes(fixture.email)); assert.ok(!created.data.url.includes(fixture.id));
  fixture.parentUrl = created.data.url;
  const token = new URL(created.data.url).pathname.split("/").at(-1)!;
  const invalid = await request("/api/billing/parent-checkout/invalid", "POST", undefined);
  assert.equal(invalid.status, 404);
  const checkout = await request(`/api/billing/parent-checkout/${token}`, "POST", undefined);
  assert.equal(checkout.status, 200, JSON.stringify(checkout));
  fixture.checkoutUrl = checkout.data.url;
  const saved = await db.parentPaymentRequest.findUniqueOrThrow({ where: { stripeSessionId: (await db.parentPaymentRequest.findFirstOrThrow({ where: { userId: fixture.id } })).stripeSessionId! } });
  fixture.sessionId = saved.stripeSessionId!;
  const session = await getStripe().checkout.sessions.retrieve(fixture.sessionId);
  assert.equal(session.livemode, false); assert.equal(session.client_reference_id, fixture.id); assert.equal(session.amount_total, 3490);
  const repeated = await request(`/api/billing/parent-checkout/${token}`, "POST", undefined);
  assert.equal(repeated.data.url, checkout.data.url);
  await writeFile(statePath, JSON.stringify(fixture));
  console.log(JSON.stringify({ checks: ["unpaid account blocked", "share requires login", "opaque link", "invalid token rejected", "test checkout bound to student", "idempotent checkout"], parentUrl: fixture.parentUrl, checkoutUrl: fixture.checkoutUrl }));
}
async function verify() {
  const fixture = await state(), cookies = await cookie(fixture);
  const status = await request("/api/billing/status", "GET", undefined, cookies);
  assert.equal(status.data.hasAccess, true, JSON.stringify(status));
  const catalog = await fetch(base + "/dashboard/provas", { headers: { Cookie: cookies }, signal: AbortSignal.timeout(120_000) });
  const html = await catalog.text();
  assert.equal(catalog.status, 200);
  for (const name of ["FUVEST", "ETEC", "UNESP", "UNICAMP", "ITA", "UEMA", "UEA", "UFPR"]) assert.ok(html.includes(name), name);
  const etec = await db.pastExam.findFirstOrThrow({ where: { institution: { slug: "etec" }, status: "catalogued" } });
  let attempt = await request("/api/past-exams/attempts", "POST", { examId: etec.id, requestId: randomUUID() }, cookies);
  assert.equal(attempt.status, 200, JSON.stringify(attempt));
  const id = attempt.data.id;
  attempt = await request(`/api/past-exams/attempts/${id}`, "GET", undefined, cookies);
  assert.equal(attempt.data.mode, "self_review"); assert.equal(attempt.data.items.length, 50); assert.equal(attempt.data.result, null);
  const saved = await request(`/api/past-exams/attempts/${id}`, "PATCH", { version: attempt.data.version, action: "pause", answers: [{ number: 1, value: "B", reviewed: true }] }, cookies);
  assert.equal(saved.status, 200, JSON.stringify(saved)); assert.equal(saved.data.status, "paused");
  const resumed = await request(`/api/past-exams/attempts/${id}`, "PATCH", { version: saved.data.version, action: "resume", answers: [] }, cookies);
  assert.equal(resumed.status, 200, JSON.stringify(resumed));
  const done = await request(`/api/past-exams/attempts/${id}`, "PATCH", { version: resumed.data.version, action: "finish", answers: [] }, cookies);
  assert.equal(done.status, 200, JSON.stringify(done)); assert.equal(done.data.result.percentage, null); assert.equal(done.data.result.wrong, 0); assert.equal(done.data.result.pending, 1);
  const explanation = "A multiplicação de dois por três corresponde à soma de três parcelas iguais a dois. Portanto, o resultado é seis, enquanto as outras alternativas não representam esse produto.";
  const generateExplanation = process.env.QA_GENERATE_EXPLANATION === "1";
  const quiz = await db.quiz.create({ data: { userId: fixture.id, title: "QA temporário de explicação", subject: "Matemática", questionCount: 1, questions: { create: [{ question: "Quanto é 2 × 3?", options: ["A) 5", "B) 6", "C) 7", "D) 8"], correctAnswer: "B", explanation: generateExplanation ? "" : explanation, order: 0 }] } }, include: { questions: true } });
  fixture.quizId = quiz.id; await writeFile(statePath, JSON.stringify(fixture));
  const answered = await request(`/api/quiz/${quiz.id}/answer`, "POST", { questionId: quiz.questions[0].id, answer: "B" }, cookies);
  assert.equal(answered.status, 200, JSON.stringify(answered));
  if (generateExplanation) assert.ok(answered.data.explanation.length > 30);
  else assert.equal(answered.data.explanation, explanation);
  console.log(JSON.stringify({ checks: ["parent payment unlocked beneficiary", "institution catalog rendered", "ETEC answer sheet", "autosave", "pause and resume", "finish without invented score", "quiz answer includes explanation"], origin: base, realCharges: 0 }));
}
async function cleanup() {
  const fixture = await state();
  if (!fixture.email.startsWith("easy-release-") || !fixture.email.endsWith("@example.com")) throw new Error("A limpeza só aceita a conta temporária desta verificação.");
  const subscription = await db.subscription.findUnique({ where: { userId: fixture.id } });
  if (subscription?.stripeSubscriptionId) {
    const remote = await getStripe().subscriptions.retrieve(subscription.stripeSubscriptionId);
    if (remote.livemode) throw new Error("Recusada limpeza de assinatura real.");
    if (remote.status !== "canceled") await getStripe().subscriptions.cancel(remote.id);
  }
  for (const row of await db.parentPaymentRequest.findMany({ where: { userId: fixture.id } })) if (row.stripeSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(row.stripeSessionId);
    if (!session.livemode && session.status === "open") await getStripe().checkout.sessions.expire(session.id);
  }
  await db.examAttempt.deleteMany({ where: { userId: fixture.id } });
  await db.studySession.deleteMany({ where: { userId: fixture.id } });
  await db.quiz.deleteMany({ where: { userId: fixture.id } });
  await db.aiCallLog.deleteMany({ where: { userId: fixture.id } });
  await db.usageEvent.deleteMany({ where: { userId: fixture.id } });
  await db.subscription.deleteMany({ where: { userId: fixture.id } });
  await db.profile.delete({ where: { userId: fixture.id } });
  const removed = await createSupabaseAdminClient().auth.admin.deleteUser(fixture.id);
  if (removed.error) throw removed.error;
  await db.stripeEvent.deleteMany({ where: { type: "easy_education.release_check" } });
  await unlink(statePath);
  console.log("Conta temporária removida; nenhuma cobrança real foi efetuada.");
}
const mode = process.argv[2];
(mode === "provision" ? provision() : mode === "parent" ? parent() : mode === "cleanup" ? cleanup() : verify()).catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => db.$disconnect());
