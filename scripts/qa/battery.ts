/**
 * Bateria de testes de ponta a ponta, como um aluno de verdade, chamando as rotas do app (servidor local ou produção).
 *
 *   npx tsx --env-file=.env.local scripts/qa/battery.ts --base http://localhost:3000 [--profiles enem,etec,concurso] [--max-quizzes 20]
 *
 * Para cada perfil: cria uma conta de teste (e-mail @easyeducation.test, assinatura de teste "trialing" no Completo,
 * marcada com provider "qa"), faz o onboarding, gera quizzes até o limite do dia recusar, responde tudo, gera os
 * simulados (IA de 90, ETEC, concurso, provas anteriores do ENEM), flashcards (deck de 30 e a partir do quiz),
 * anotações, inicia e conclui um bloco do plano (com check manual) e fecha o dia.
 * Depois, outra IA (gemini-2.5-flash, que não é a que gera) resolve todas as questões às cegas e um juiz avalia uma
 * amostra quanto ao nível e ao estilo do perfil. O relatório vai para docs/qa/.
 * As contas ficam guardadas em scripts/qa/.qa-accounts.local.json (fora do git) para abrir no navegador depois.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { Type } from "@google/genai";
import { runWithAiCallContext } from "@/lib/ai-cost";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { ensureProfileForUser } from "@/lib/profile";
import { solveBlind } from "@/lib/question-quality";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const BASE = arg("base", "http://localhost:3000")!;
const MAX_QUIZZES = Number(arg("max-quizzes", "20"));
const PROFILE_IDS = (arg("profiles", "enem,etec,concurso") ?? "").split(",").filter(Boolean);
const ACCOUNTS_FILE = "scripts/qa/.qa-accounts.local.json";
const startedAt = new Date();

type Personalization = Record<string, unknown>;
type QaProfile = {
  id: string;
  label: string;
  personalization: Personalization;
  goal: string;
  level: string;
  subjects: Array<{ name: string; difficulty: number }>;
  quizTopics: Array<{ subject: string; topic: string; difficulty: string }>;
  expectedOptions: number;
};

const PROFILES: Record<string, QaProfile> = {
  enem: {
    id: "enem",
    label: "ENEM, 3º ano do ensino médio, nível intermediário, dificuldade em interpretação",
    personalization: { purpose: "enem_vestibular", exam: "ENEM", schoolYear: "3º ano do ensino médio", challenges: ["interpretacao", "calculo"], explanationStyle: "passo_a_passo", practicePreference: "questoes", course: "Medicina" },
    goal: "ENEM",
    level: "intermediate",
    subjects: [{ name: "Biologia", difficulty: 3 }, { name: "Matematica", difficulty: 5 }, { name: "Quimica", difficulty: 4 }, { name: "Historia", difficulty: 2 }],
    quizTopics: [
      { subject: "Biologia", topic: "Genética e leis de Mendel", difficulty: "medio" },
      { subject: "Matematica", topic: "Funções do 1º e 2º grau", difficulty: "medio" },
      { subject: "Quimica", topic: "Estequiometria", difficulty: "dificil" },
      { subject: "Historia", topic: "Era Vargas", difficulty: "medio" },
      { subject: "Fisica", topic: "Cinemática", difficulty: "facil" },
      { subject: "Geografia", topic: "Urbanização brasileira", difficulty: "medio" },
      { subject: "Portugues", topic: "Interpretação de texto e gêneros textuais", difficulty: "medio" },
      { subject: "Biologia", topic: "Ecologia e cadeias alimentares", difficulty: "medio" },
      { subject: "Matematica", topic: "Probabilidade e estatística", difficulty: "dificil" },
      { subject: "Quimica", topic: "Funções orgânicas", difficulty: "medio" },
      { subject: "Filosofia", topic: "Iluminismo e contratualistas", difficulty: "medio" },
      { subject: "Sociologia", topic: "Movimentos sociais", difficulty: "facil" },
      { subject: "Fisica", topic: "Eletricidade e circuitos", difficulty: "dificil" },
      { subject: "Historia", topic: "Revolução Industrial", difficulty: "medio" },
      { subject: "Geografia", topic: "Climas do Brasil", difficulty: "medio" },
      { subject: "Matematica", topic: "Geometria plana e áreas", difficulty: "medio" },
      { subject: "Biologia", topic: "Citologia", difficulty: "facil" },
      { subject: "Quimica", topic: "Soluções e concentração", difficulty: "medio" },
      { subject: "Ingles", topic: "Interpretação de texto em inglês", difficulty: "medio" },
      { subject: "Literatura", topic: "Modernismo brasileiro", difficulty: "medio" },
      { subject: "Matematica", topic: "Porcentagem e juros", difficulty: "facil" },
    ],
    expectedOptions: 5,
  },
  etec: {
    id: "etec",
    label: "Vestibulinho da ETEC, 9º ano do fundamental",
    personalization: { purpose: "etec", schoolYear: "9º ano", challenges: ["base"], explanationStyle: "exemplos" },
    goal: "Vestibulinho ETEC",
    level: "beginner",
    subjects: [{ name: "Portugues", difficulty: 3 }, { name: "Matematica", difficulty: 4 }, { name: "Ciencias da Natureza", difficulty: 3 }],
    quizTopics: [
      { subject: "Matematica", topic: "Frações e porcentagem", difficulty: "medio" },
      { subject: "Ciencias da Natureza", topic: "Sistema solar", difficulty: "facil" },
      { subject: "Portugues", topic: "Interpretação de tirinhas e gráficos", difficulty: "medio" },
    ],
    expectedOptions: 5,
  },
  concurso: {
    id: "concurso",
    label: "Concurso de Soldado PM-SP, banca Vunesp",
    personalization: { purpose: "concurso", role: "Soldado PM-SP", board: "Vunesp", challenges: ["tempo"], explanationStyle: "direta" },
    goal: "Concurso · Soldado PM-SP",
    level: "intermediate",
    subjects: [{ name: "Portugues", difficulty: 3 }, { name: "Matematica", difficulty: 3 }],
    quizTopics: [
      { subject: "Portugues", topic: "Concordância verbal", difficulty: "medio" },
      { subject: "Matematica", topic: "Regra de três", difficulty: "medio" },
    ],
    expectedOptions: 5,
  },
  escola: {
    id: "escola",
    label: "Escola, 1º ano do ensino médio (4 alternativas)",
    personalization: { purpose: "escola", schoolYear: "1º ano do ensino médio" },
    goal: "Escola · 1º ano do ensino médio",
    level: "beginner",
    subjects: [{ name: "Fisica", difficulty: 4 }],
    quizTopics: [{ subject: "Fisica", topic: "Leis de Newton", difficulty: "medio" }],
    expectedOptions: 4,
  },
};

type Finding = { profile: string; area: string; severity: "erro" | "aviso" | "ok"; message: string };
const findings: Finding[] = [];
const log = (profile: string, area: string, severity: Finding["severity"], message: string) => {
  findings.push({ profile, area, severity, message });
  console.log(`[${profile}] ${severity === "erro" ? "✗" : severity === "aviso" ? "!" : "✓"} ${area}: ${message}`);
};

/** Cookies da sessão no formato do @supabase/ssr (o mesmo que o navegador mandaria). */
async function sessionCookies(email: string, password: string) {
  const jar = new Map<string, string>();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function api(cookie: string) {
  return async <T = Record<string, unknown>>(method: string, path: string, body?: unknown) => {
    const started = Date.now();
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { cookie, "Content-Type": "application/json", Origin: BASE },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 300) };
    }
    return { status: response.status, data: data as T & { error?: string; code?: string }, ms: Date.now() - started, text };
  };
}

async function createAccount(profile: QaProfile) {
  const admin = createSupabaseAdminClient();
  const email = `qa.${profile.id}.${Date.now()}@easyeducation.test`;
  const password = `Qa!${randomBytes(9).toString("base64url")}9`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `QA ${profile.label.split(",")[0]}`, terms_version: "qa" } });
  if (error || !data.user) throw error ?? new Error("Usuário de teste não criado.");
  await ensureProfileForUser(data.user);
  // Assinatura de teste (Completo, em teste grátis), sem Stripe: só para a conta QA passar pelo /assinar.
  await getPrisma().subscription.create({
    data: { userId: data.user.id, stripeCustomerId: `qa_${data.user.id}`, plan: "full", status: "trialing", provider: "qa", currentPeriodEnd: new Date(Date.now() + 7 * 86_400_000) },
  });
  const accounts = existsSync(ACCOUNTS_FILE) ? JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) : [];
  accounts.push({ profile: profile.id, email, password, userId: data.user.id, createdAt: new Date().toISOString() });
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  return { userId: data.user.id, email, password };
}

type QuizRow = { id: string; title: string; subject: string; difficulty: string; questions: Array<{ id: string; question: string; options: unknown; correctAnswer: string; explanation: string }> };
const allQuestions: Array<{ profile: string; kind: string; quizId: string; subject: string; q: QuizRow["questions"][number] }> = [];

/** Confere a estrutura de cada questão (sem IA). */
function checkStructure(profile: QaProfile, kind: string, quiz: QuizRow, expectedCount: number) {
  const issues: string[] = [];
  if (quiz.questions.length !== expectedCount) issues.push(`veio com ${quiz.questions.length} de ${expectedCount} questões`);
  const seen = new Set<string>();
  const letters: Record<string, number> = {};
  for (const [index, question] of quiz.questions.entries()) {
    const options = Array.isArray(question.options) ? (question.options as string[]) : [];
    if (options.length !== profile.expectedOptions) issues.push(`Q${index + 1}: ${options.length} alternativas (esperado ${profile.expectedOptions})`);
    const labels = options.map((option) => option.charAt(0));
    if (!labels.includes(question.correctAnswer)) issues.push(`Q${index + 1}: gabarito ${question.correctAnswer} não está nas alternativas`);
    const bodies = options.map((option) => option.replace(/^[A-E]\)\s*/, "").trim().toLowerCase());
    if (new Set(bodies).size !== bodies.length) issues.push(`Q${index + 1}: alternativas repetidas`);
    if (bodies.some((body) => body.length < 1 || /^[a-e]$/.test(body))) issues.push(`Q${index + 1}: alternativa vazia ou só a letra`);
    if (question.question.length < 40) issues.push(`Q${index + 1}: enunciado curto demais (${question.question.length} caracteres)`);
    if (!question.explanation || question.explanation.length < 30) issues.push(`Q${index + 1}: explicação curta ou vazia`);
    const key = question.question.slice(0, 80).toLowerCase();
    if (seen.has(key)) issues.push(`Q${index + 1}: enunciado repetido no mesmo ${kind}`);
    seen.add(key);
    letters[question.correctAnswer] = (letters[question.correctAnswer] ?? 0) + 1;
    allQuestions.push({ profile: profile.id, kind, quizId: quiz.id, subject: quiz.subject, q: question });
  }
  const top = Object.entries(letters).sort((a, b) => b[1] - a[1])[0];
  if (top && quiz.questions.length >= 10 && top[1] / quiz.questions.length > 0.5) issues.push(`gabarito concentrado na letra ${top[0]} (${top[1]} de ${quiz.questions.length})`);
  return { issues, letters };
}

async function loadQuiz(id: string) {
  return getPrisma().quiz.findUnique({ where: { id }, include: { questions: { orderBy: { order: "asc" } } } }) as Promise<QuizRow | null>;
}

/** Responde todas as questões pela rota real: acerta 7 de cada 10 de propósito e confere a correção do servidor. */
async function answerAll(call: ReturnType<typeof api>, profile: QaProfile, quiz: QuizRow, kind: string) {
  let correctSent = 0;
  let mismatches = 0;
  for (const [index, question] of quiz.questions.entries()) {
    const right = index % 10 < 7;
    const options = (question.options as string[]).map((option) => option.charAt(0));
    const answer = right ? question.correctAnswer : (options.find((letter) => letter !== question.correctAnswer) ?? "A");
    const result = await call<{ correct: boolean }>("POST", `/api/quiz/${quiz.id}/answer`, { questionId: question.id, answer });
    if (result.status !== 200) {
      log(profile.id, kind, "erro", `resposta da Q${index + 1} recusada (${result.status}): ${result.data?.error ?? result.text.slice(0, 120)}`);
      continue;
    }
    if (result.data.correct !== right) mismatches += 1;
    if (right) correctSent += 1;
  }
  const again = await call("POST", `/api/quiz/${quiz.id}/answer`, { questionId: quiz.questions[0].id, answer: "A" });
  if (again.status !== 409) log(profile.id, kind, "erro", `responder de novo devolveu ${again.status} (esperado 409)`);
  const done = await getPrisma().quiz.findUnique({ where: { id: quiz.id }, select: { completedAt: true, score: true } });
  const expectedScore = Math.round((correctSent / quiz.questions.length) * 100);
  if (!done?.completedAt) log(profile.id, kind, "erro", "quiz respondido inteiro não ficou concluído");
  else if (Math.round(done.score ?? -1) !== expectedScore) log(profile.id, kind, "erro", `nota ${done.score} diferente da esperada ${expectedScore}`);
  if (mismatches) log(profile.id, kind, "erro", `${mismatches} respostas corrigidas errado pelo servidor`);
  return { correctSent, score: done?.score ?? null };
}

async function runProfile(profile: QaProfile) {
  console.log(`\n=== Perfil: ${profile.label} ===`);
  const account = await createAccount(profile);
  const cookie = await sessionCookies(account.email, account.password);
  const call = api(cookie);
  const report: Record<string, unknown> = { profile: profile.id, label: profile.label, userId: account.userId, email: account.email };

  // Páginas protegidas abrem com a sessão (antes do onboarding, o dashboard pode mandar para o onboarding).
  const onboarding = await call("POST", "/api/onboarding", {
    goal: profile.goal,
    level: profile.level,
    dailyMinutes: 90,
    studyMethod: "Questões e simulados, Revisão espaçada",
    subjects: profile.subjects,
    personalization: profile.personalization,
  });
  log(profile.id, "onboarding", onboarding.status === 200 ? "ok" : "erro", `plano gerado em ${onboarding.ms} ms (status ${onboarding.status}${onboarding.data?.error ? `: ${onboarding.data.error}` : ""})`);

  // ---------- Quizzes até o limite do dia recusar ----------
  const quizzes: Array<Record<string, unknown>> = [];
  for (let i = 0; i < MAX_QUIZZES + 1; i += 1) {
    const topic = profile.quizTopics[i % profile.quizTopics.length];
    const result = await call<{ quizId: string }>("POST", "/api/quiz/generate", { subject: topic.subject, topic: topic.topic, difficulty: topic.difficulty, questionCount: 20 });
    if (result.status !== 200) {
      log(profile.id, "quiz", result.status === 429 && i > 0 ? "ok" : "erro", `pedido ${i + 1}: ${result.status} ${result.data?.code ?? ""} ${result.data?.error ?? ""} (${result.ms} ms)`);
      if (result.status === 429 || result.status === 403 || result.status === 402) break;
      continue;
    }
    const quiz = await loadQuiz(result.data.quizId);
    if (!quiz) continue;
    const structure = checkStructure(profile, "quiz", quiz, 20);
    for (const issue of structure.issues) log(profile.id, `quiz ${i + 1} (${topic.subject})`, "erro", issue);
    const answers = i < 3 ? await answerAll(call, profile, quiz, `quiz ${i + 1}`) : null;
    quizzes.push({ id: quiz.id, subject: topic.subject, topic: topic.topic, ms: result.ms, count: quiz.questions.length, letters: structure.letters, issues: structure.issues.length, answered: Boolean(answers) });
    console.log(`  quiz ${i + 1}: ${quiz.questions.length} questões em ${(result.ms / 1000).toFixed(1)} s (${topic.subject} · ${topic.topic})`);
  }
  report.quizzes = quizzes;

  // ---------- Simulados ----------
  const simulados: Array<Record<string, unknown>> = [];
  const skipBig = process.argv.includes("--skip-ia-90");
  const big = skipBig ? { status: 0, data: { quizId: "" } as { quizId: string; error?: string }, ms: 0, text: "pulado (--skip-ia-90)" } : await call<{ quizId: string }>("POST", "/api/quiz/generate", { subject: "Multidisciplinar", topic: profile.subjects.map((item) => item.name).join(", "), difficulty: "simulado", questionCount: 90 });
  if (big.status === 200) {
    const quiz = (await loadQuiz(big.data.quizId))!;
    const structure = checkStructure(profile, "simulado IA 90", quiz, 90);
    for (const issue of structure.issues) log(profile.id, "simulado IA 90", issue.startsWith("veio com") ? "erro" : "aviso", issue);
    log(profile.id, "simulado IA 90", quiz.questions.length === 90 ? "ok" : "erro", `${quiz.questions.length} questões em ${(big.ms / 1000).toFixed(1)} s`);
    await answerAll(call, profile, quiz, "simulado IA 90");
    simulados.push({ kind: "ia-90", id: quiz.id, count: quiz.questions.length, ms: big.ms });
  } else if (!skipBig) log(profile.id, "simulado IA 90", "erro", `${big.status} ${big.data?.error ?? big.text.slice(0, 200)}`);
  const overLimit = skipBig ? null : await call("POST", "/api/quiz/generate", { subject: "Matematica", difficulty: "simulado", questionCount: 10 });
  if (overLimit) log(profile.id, "simulado acima do limite", overLimit.status === 429 ? "ok" : "erro", `pedido depois de gastar as 90 do dia: ${overLimit.status} ${overLimit.data?.code ?? ""}`);

  if (profile.id === "etec") {
    const etec = await call<{ quizId: string }>("POST", "/api/simulados/etec");
    if (etec.status === 200) {
      const quiz = (await loadQuiz(etec.data.quizId))!;
      const structure = checkStructure(profile, "simulado ETEC", quiz, 50);
      for (const issue of structure.issues) log(profile.id, "simulado ETEC", issue.startsWith("veio com") ? "erro" : "aviso", issue);
      log(profile.id, "simulado ETEC", quiz.questions.length === 50 ? "ok" : "erro", `${quiz.questions.length} questões em ${(etec.ms / 1000).toFixed(1)} s`);
      simulados.push({ kind: "etec", id: quiz.id, count: quiz.questions.length, ms: etec.ms });
    } else log(profile.id, "simulado ETEC", etec.status === 429 ? "aviso" : "erro", `${etec.status} ${etec.data?.error ?? ""} (o limite de questões do dia pode já ter sido gasto pelo simulado de 90)`);
  }
  if (profile.id === "concurso") {
    const concurso = await call<{ quizId: string }>("POST", "/api/simulados/concurso");
    log(profile.id, "simulado do concurso", concurso.status === 200 || concurso.status === 429 ? "ok" : "erro", `${concurso.status} ${concurso.data?.error ?? ""}`);
    if (concurso.status === 200) {
      const quiz = (await loadQuiz(concurso.data.quizId))!;
      for (const issue of checkStructure(profile, "simulado concurso", quiz, 30).issues) log(profile.id, "simulado concurso", "aviso", issue);
    }
  }
  if (profile.id === "enem") {
    for (const day of ["dia1", "dia2", "completo"] as const) {
      const session = await call<{ sessionId?: string; id?: string }>("POST", "/api/bank/sessions", { kind: "enem", day });
      const sessionId = session.data?.sessionId ?? session.data?.id;
      const row = sessionId ? await getPrisma().bankSession.findUnique({ where: { id: sessionId } }) : null;
      const total = Array.isArray(row?.questionIds) ? row!.questionIds.length : 0;
      const expected = day === "completo" ? 180 : 90;
      log(profile.id, `provas anteriores ENEM (${day})`, session.status === 200 && total === expected ? "ok" : "erro", `status ${session.status}, ${total} questões (esperado ${expected}), tempo ${row?.timeLimitSec ?? "?"} s`);
      if (day === "dia2" && row && Array.isArray(row.questionIds)) {
        const ids = (row.questionIds as string[]).slice(0, 10);
        const questions = await getPrisma().bankQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, correctLabel: true } });
        let wrongFeedback = 0;
        for (const [index, question] of questions.entries()) {
          const selected = index % 2 ? question.correctLabel : question.correctLabel === "A" ? "B" : "A";
          const answer = await call<{ isCorrect?: boolean; correct?: boolean }>("POST", "/api/bank/answers", { questionId: question.id, sessionId: row.id, selected });
          const flag = answer.data?.isCorrect ?? answer.data?.correct;
          if (answer.status !== 200 || flag !== (selected === question.correctLabel)) wrongFeedback += 1;
        }
        const finish = await call("POST", `/api/bank/sessions/${row.id}/finish`);
        log(profile.id, "provas anteriores: responder e terminar", wrongFeedback === 0 && finish.status === 200 ? "ok" : "erro", `${questions.length} respostas, ${wrongFeedback} com correção errada, terminar: ${finish.status}`);
      }
    }
  }
  report.simulados = simulados;

  // ---------- Flashcards ----------
  const deck = await call<{ deckId: string }>("POST", "/api/flashcards/generate", { title: `Deck de teste ${profile.id}`, subject: profile.subjects[0].name, topic: profile.quizTopics[0].topic, count: 30 });
  if (deck.status === 200) {
    const cards = await getPrisma().flashcard.findMany({ where: { deckId: deck.data.deckId } });
    log(profile.id, "flashcards (deck de 30)", cards.length >= 21 ? (cards.length === 30 ? "ok" : "aviso") : "erro", `${cards.length} cartões em ${(deck.ms / 1000).toFixed(1)} s`);
    const reviewed = await Promise.all(cards.slice(0, 5).map((card, index) => call("POST", `/api/flashcards/${card.id}/review`, { quality: ["again", "medium", "good"][index % 3] })));
    const stamped = await getPrisma().flashcard.count({ where: { id: { in: cards.slice(0, 5).map((card) => card.id) }, lastReviewedAt: { not: null } } });
    log(profile.id, "revisão de flashcards", reviewed.every((item) => item.status === 200) && stamped === 5 ? "ok" : "erro", `5 revisões, ${stamped} com data de revisão`);
  } else log(profile.id, "flashcards (deck de 30)", "erro", `${deck.status} ${deck.data?.error ?? ""}`);
  const firstQuiz = quizzes[0]?.id as string | undefined;
  if (firstQuiz) {
    const check = await call<{ wrong: number; recentDeck: unknown }>("GET", `/api/flashcards/from-quiz?quizId=${firstQuiz}`);
    const fromQuiz = await call<{ deckId: string; added: number }>("POST", "/api/flashcards/from-quiz", { quizId: firstQuiz });
    const linked = fromQuiz.status === 200 ? await getPrisma().flashcard.count({ where: { deckId: fromQuiz.data.deckId, sourceQuizQuestionId: { not: null } } }) : 0;
    log(profile.id, "flashcards do quiz", fromQuiz.status === 200 && linked > 0 ? "ok" : "erro", `consulta ${check.status} (erradas: ${check.data?.wrong}, deck recente: ${check.data?.recentDeck ? "sim" : "não"}); criados ${fromQuiz.data?.added ?? 0}, ${linked} ligados à questão de origem (${fromQuiz.status} ${fromQuiz.data?.error ?? ""})`);
  }

  // ---------- Plano: bloco de hoje ----------
  const plan = await getPrisma().studyPlan.findFirst({ where: { userId: account.userId, status: "active" }, orderBy: { createdAt: "desc" } });
  const { getTodayPlanBlocks, parseStudyPlan } = await import("@/lib/study-plan");
  const today = getTodayPlanBlocks(parseStudyPlan(plan?.planData));
  if (!today.length) log(profile.id, "plano de hoje", "aviso", "hoje é dia de descanso no plano gerado; bloco não testado");
  else {
    const block = today[0];
    const body = { subject: block.subject, topic: block.topic, method: block.method, type: block.type };
    const first = await call<{ href: string; reused: boolean; runId: string }>("POST", "/api/study-plan/start", body);
    const again = await call<{ href: string; reused: boolean }>("POST", "/api/study-plan/start", body);
    log(profile.id, "bloco: iniciar e continuar", first.status === 200 && again.status === 200 && again.data.reused && again.data.href === first.data.href ? "ok" : "erro", `iniciar ${first.status} (${(first.ms / 1000).toFixed(1)} s, ${first.data?.href}); continuar ${again.status}, reaproveitou: ${again.data?.reused}, mesma atividade: ${again.data?.href === first.data?.href}`);
    const panel = await call<{ run: { id: string; steps: unknown[]; checks: boolean[]; autoChecks: boolean[] } | null }>("GET", "/api/study-plan/run");
    const run = panel.data?.run;
    log(profile.id, "roteiro no painel", run ? "ok" : "erro", run ? `${run.steps.length} etapas, marcadas: ${run.checks.filter(Boolean).length}` : "painel sem bloco");
    if (run) {
      const free = run.autoChecks.findIndex((auto) => !auto);
      const toggled = await call<{ run: { checks: boolean[] } }>("POST", `/api/study-plan/run/${run.id}`, { action: "toggle_step", step: free });
      log(profile.id, "check manual de etapa", toggled.status === 200 && toggled.data.run.checks[free] ? "ok" : "erro", `etapa ${free + 1}: ${toggled.status}`);
      const note = await call("POST", "/api/notes", { content: "Fechando o bloco: expliquei com minhas palavras o que estudei hoje.", subject: block.subject, topic: block.topic, blockDay: (await import("@/lib/study-completion")).dayKeySP(), blockKey: (await import("@/lib/study-completion")).blockKey(block) });
      log(profile.id, "anotação no bloco", note.status === 200 ? "ok" : "erro", `${note.status}`);
      const activityId = (await getPrisma().studyBlockRun.findUnique({ where: { id: run.id } }))?.activityId;
      const blockQuiz = activityId ? await loadQuiz(activityId) : null;
      if (blockQuiz) await answerAll(call, profile, blockQuiz, "quiz do bloco");
      const after = await call<{ run: { status: string; checks: boolean[] } | null }>("GET", "/api/study-plan/run");
      const blocked = await call("POST", "/api/study-plan/start", body);
      const status = (await getPrisma().studyBlockRun.findUnique({ where: { id: run.id } }))?.status;
      log(profile.id, "bloco concluído e travado", status === "concluido" && blocked.status === 409 ? "ok" : blockQuiz ? "erro" : "aviso", `status ${status}; painel: ${after.data?.run?.status ?? "sem bloco"}; iniciar de novo: ${blocked.status} (esperado 409)${blockQuiz ? "" : " — a atividade do bloco não é quiz, não deu para concluir automaticamente"}`);
    }
  }

  // ---------- Anotações ----------
  const notes = await Promise.all(
    ["Mitocôndria: produz ATP pela respiração celular.", "Revisar a fórmula de Bhaskara e o discriminante.", "Na Era Vargas, a CLT é de 1943."].map((content, index) =>
      call("POST", "/api/notes", { content, subject: profile.subjects[index % profile.subjects.length].name }),
    ),
  );
  const list = await call<{ notes: unknown[] }>("GET", `/api/notes?subject=${encodeURIComponent(profile.subjects[0].name)}`);
  const empty = await call("POST", "/api/notes", { content: "   " });
  log(profile.id, "anotações", notes.every((item) => item.status === 200) && Array.isArray(list.data?.notes) && empty.status === 400 ? "ok" : "erro", `3 criadas (${notes.map((item) => item.status).join(",")}), filtro por matéria trouxe ${list.data?.notes?.length ?? "?"}, anotação vazia: ${empty.status} (esperado 400)`);

  // ---------- Fechar o dia ----------
  const short = await call("POST", "/api/day-summary", { content: "curto demais" });
  const summaryText =
    `Hoje estudei ${profile.quizTopics[0].topic} e fiz vários quizzes. Aprendi que ${profile.id === "enem" ? "nas leis de Mendel o cruzamento de dois heterozigotos Aa x Aa dá proporção fenotípica de 1:1, e que genes recessivos sempre somem na geração seguinte" : profile.id === "etec" ? "metade de um quarto é igual a um meio, e que Plutão ainda é o nono planeta do sistema solar" : "na concordância verbal o verbo sempre concorda com o termo mais próximo, mesmo com sujeito composto antes do verbo"}. Também revisei os erros dos simulados e anotei as dúvidas principais para amanhã.`;
  const summary = await call<{ summary: { feedback: { wrong: unknown[]; cards: unknown[]; correct: unknown[] } } }>("POST", "/api/day-summary", { content: summaryText });
  const feedback = summary.data?.summary?.feedback;
  log(profile.id, "fechar o dia", short.status === 400 && summary.status === 200 && (feedback?.wrong?.length ?? 0) > 0 ? "ok" : "erro", `curto: ${short.status} (esperado 400); correção ${summary.status} em ${(summary.ms / 1000).toFixed(1)} s, erros apontados: ${feedback?.wrong?.length ?? 0} (o texto tinha erros de propósito), cartões: ${feedback?.cards?.length ?? 0}`);
  const second = await call("POST", "/api/day-summary", { content: summaryText });
  log(profile.id, "fechar o dia duas vezes", second.status === 409 ? "ok" : "erro", `${second.status} (esperado 409)`);
  if ((feedback?.cards?.length ?? 0) > 0) {
    const cards = await call<{ deckId: string }>("POST", "/api/day-summary/flashcards");
    log(profile.id, "erros do resumo viram flashcards", cards.status === 200 ? "ok" : "erro", `${cards.status}`);
  }

  // ---------- Páginas ----------
  const pageIds = { quiz: quizzes[0]?.id, simulado: simulados[0]?.id };
  for (const path of ["/dashboard", "/dashboard/plano", "/dashboard/trilha", "/dashboard/quizzes", "/dashboard/simulados", "/dashboard/flashcards", "/dashboard/anotacoes", "/dashboard/fechar-dia", "/dashboard/desempenho", "/dashboard/assinatura", "/dashboard/busca?q=revisar", pageIds.quiz ? `/dashboard/quizzes/${pageIds.quiz}` : null, pageIds.simulado ? `/dashboard/simulados/${pageIds.simulado}` : null].filter(Boolean) as string[]) {
    const page = await call("GET", path);
    const broken = page.status !== 200 || /Application error|Erro ao abrir|Unhandled Runtime Error|NEXT_REDIRECT/.test(page.text);
    log(profile.id, `página ${path}`, broken ? "erro" : "ok", `${page.status} em ${page.ms} ms`);
  }
  return report;
}

/** Outra IA resolve todas as questões às cegas; diferença do gabarito = possível questão errada para revisar. */
async function independentCheck() {
  const results: Array<{ profile: string; kind: string; subject: string; agree: boolean; question: string; gabarito: string; outra: string; quizId: string; explanation: string }> = [];
  const groups = new Map<number, typeof allQuestions>();
  for (const item of allQuestions) {
    const count = Array.isArray(item.q.options) ? item.q.options.length : 4;
    groups.set(count, [...(groups.get(count) ?? []), item]);
  }
  for (const [count, items] of groups) {
    for (let i = 0; i < items.length; i += 15) {
      const batch = items.slice(i, i + 15);
      let answers = new Map<number, string>();
      try {
        answers = await runWithAiCallContext({ userId: null, plan: null, feature: "qa_independent" }, () =>
          solveBlind(batch.map((item) => ({ question: item.q.question, options: item.q.options as string[] })), count as 4 | 5, { model: "gemini-2.5-flash" }),
        );
      } catch (error) {
        console.error("conferência independente falhou num lote:", error instanceof Error ? error.message : error);
        continue;
      }
      batch.forEach((item, index) => {
        const other = answers.get(index) ?? "?";
        results.push({ profile: item.profile, kind: item.kind, subject: item.subject, agree: other === item.q.correctAnswer, question: item.q.question, gabarito: item.q.correctAnswer, outra: other, quizId: item.quizId, explanation: item.q.explanation });
      });
      process.stdout.write(`\rconferência independente: ${Math.min(i + 15, items.length)}/${items.length} (${count} alternativas)`);
    }
  }
  process.stdout.write("\n");
  return results;
}

/** Um juiz avalia uma amostra: nível e estilo do perfil, erro factual e alternativas defensáveis. */
async function judgeSample() {
  const verdicts: Array<Record<string, unknown>> = [];
  const byProfile = new Map<string, typeof allQuestions>();
  for (const item of allQuestions) byProfile.set(item.profile, [...(byProfile.get(item.profile) ?? []), item]);
  for (const [profileId, items] of byProfile) {
    const sample = items.filter((_, index) => index % Math.max(1, Math.floor(items.length / 15)) === 0).slice(0, 15);
    const listing = sample.map((item, index) => `${index + 1}) [${item.subject}] ${item.q.question}\n${(item.q.options as string[]).join("\n")}\nGabarito: ${item.q.correctAnswer}\nExplicação: ${item.q.explanation}`).join("\n\n");
    try {
      const judged = await runWithAiCallContext({ userId: null, plan: null, feature: "qa_judge" }, () =>
        generateJSON<Array<{ n: number; nivel_ok: boolean; estilo_ok: boolean; gabarito_ok: boolean; uma_correta: boolean; explicacao_ok: boolean; comentario: string }>>(
          `Você é um professor revisando questões geradas por IA para este aluno: ${PROFILES[profileId].label}.
Para cada questão, avalie com rigor:
- nivel_ok: a dificuldade e o conteúdo são adequados ao nível e à etapa do aluno;
- estilo_ok: o formato segue a prova do aluno (ex.: ENEM com texto-base e contexto; ETEC no nível do 9º ano; Vunesp objetiva);
- gabarito_ok: o gabarito marcado está correto;
- uma_correta: há uma única alternativa defensável;
- explicacao_ok: a explicação está correta e sem erro factual;
- comentario: uma frase curta com o principal problema (vazio se nenhum).

${listing}

Responda um array JSON com n, nivel_ok, estilo_ok, gabarito_ok, uma_correta, explicacao_ok e comentario.`,
          {
            model: "gemini-2.5-flash",
            thinkingBudget: 2048,
            temperature: 0,
            schema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { n: { type: Type.INTEGER }, nivel_ok: { type: Type.BOOLEAN }, estilo_ok: { type: Type.BOOLEAN }, gabarito_ok: { type: Type.BOOLEAN }, uma_correta: { type: Type.BOOLEAN }, explicacao_ok: { type: Type.BOOLEAN }, comentario: { type: Type.STRING } },
                required: ["n", "nivel_ok", "estilo_ok", "gabarito_ok", "uma_correta", "explicacao_ok", "comentario"],
              },
            },
          },
        ),
      );
      for (const verdict of judged) verdicts.push({ profile: profileId, ...verdict, question: sample[verdict.n - 1]?.q.question.slice(0, 160), subject: sample[verdict.n - 1]?.subject });
    } catch (error) {
      console.error("juiz falhou:", error instanceof Error ? error.message : error);
    }
  }
  return verdicts;
}

async function main() {
  const reports = [];
  for (const id of PROFILE_IDS) {
    try {
      reports.push(await runProfile(PROFILES[id]));
    } catch (error) {
      log(id, "perfil", "erro", `o teste parou: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    }
  }
  console.log(`\nQuestões coletadas: ${allQuestions.length}. Conferindo com outra IA…`);
  const independent = await independentCheck();
  const verdicts = await judgeSample();
  const cost = await getPrisma().aiCallLog.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: startedAt } } });
  mkdirSync("docs/qa", { recursive: true });
  const file = `docs/qa/bateria-${startedAt.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify({ startedAt, base: BASE, reports, findings, independent, verdicts, costUsd: Number(cost._sum.costUsd ?? 0) }, null, 2));
  const disagree = independent.filter((item) => !item.agree);
  console.log(`\nResultado: ${findings.filter((item) => item.severity === "erro").length} erros, ${findings.filter((item) => item.severity === "aviso").length} avisos.`);
  console.log(`Outra IA discordou do gabarito em ${disagree.length} de ${independent.length} questões.`);
  console.log(`Juiz: ${verdicts.filter((item) => !item.gabarito_ok || !item.uma_correta || !item.explicacao_ok).length} de ${verdicts.length} com problema de conteúdo; ${verdicts.filter((item) => !item.nivel_ok || !item.estilo_ok).length} fora do nível/estilo.`);
  console.log(`Custo de IA desta bateria (todas as chamadas no período): US$ ${Number(cost._sum.costUsd ?? 0).toFixed(4)}. Relatório: ${file}`);
  await getPrisma().$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
