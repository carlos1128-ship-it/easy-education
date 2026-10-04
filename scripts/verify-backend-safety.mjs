import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  failures.push(message);
}

function collectRouteFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
    } else if (entry === "route.ts") {
      files.push(relative(root, fullPath).replaceAll("\\", "/"));
    }
  }

  return files;
}

const routeFiles = collectRouteFiles(join(root, "src/app/api"));
const explicitSafeRoutes = new Set(["src/app/api/auth/signup/route.ts"]);

for (const routeFile of routeFiles) {
  const source = read(routeFile);
  const hasHandler = /export\s+async\s+function\s+(GET|POST|DELETE|PUT|PATCH)/.test(source);
  if (!hasHandler) continue;

  if (!explicitSafeRoutes.has(routeFile) && !source.includes("apiErrorResponse(")) {
    fail(`${routeFile} does not use apiErrorResponse for unexpected failures.`);
  }
}

const chatRoute = read("src/app/api/chat/route.ts");
if (chatRoute.includes("@/lib/pdf")) {
  fail("src/app/api/chat/route.ts must not import @/lib/pdf; PDF parsing must stay isolated from chat.");
}

const clientResponse = read("src/lib/client-response.ts");
if (/error:\s*response\.ok\s*\?[^:]+:\s*text|text\.slice/.test(clientResponse)) {
  fail("src/lib/client-response.ts must not expose raw non-JSON response text to the UI.");
}

const signupApi = read("src/app/api/auth/signup/route.ts");
const signupUi = read("src/components/auth/auth-forms.tsx");
if (signupApi.includes("debugMessage") || signupUi.includes("debugMessage") || signupUi.includes("Detalhe tecnico")) {
  fail("Signup flow must not send or render debugMessage/technical details.");
}

const uploadRoute = read("src/app/api/files/upload/route.ts");
const uploader = read("src/components/files/file-uploader.tsx");
if (uploadRoute.includes("application/msword") || uploadRoute.includes("openxmlformats")) {
  fail("Upload route advertises DOC/DOCX without a server-side text extractor.");
}
if (/\.docx?|DOCX|DOC,/.test(uploader)) {
  fail("File uploader UI advertises DOC/DOCX without a server-side text extractor.");
}

const nextConfig = read("next.config.ts");
if (!nextConfig.includes("@napi-rs/canvas")) {
  fail("next.config.ts must include @napi-rs/canvas in tracing/external package config for PDF parsing.");
}

const generationFiles = [
  "src/app/api/quiz/generate/route.ts",
  "src/app/api/flashcards/generate/route.ts",
  "src/app/api/essay/correct/route.ts",
  "src/lib/quiz-questions.ts",
  "src/lib/simulado.ts",
];

for (const file of generationFiles) {
  const source = read(file);
  if (/fallback(QuizQuestions|Flashcards|EssayFeedback)/.test(source)) {
    fail(`${file} must not persist generic AI fallback content.`);
  }

  if (source.includes("A) Alternativa correta") || source.includes("B) Distrator plausivel")) {
    fail(`${file} contains placeholder quiz answers that could leak into generated content.`);
  }
}

const builtRoutes = [
  ".next/server/app/api/chat/route.js",
  ".next/server/app/api/files/[id]/process/route.js",
];

for (const builtRoute of builtRoutes) {
  const fullPath = join(root, builtRoute);
  if (!existsSync(fullPath)) {
    fail(`${builtRoute} is missing. Run npm run build before verify:backend.`);
    continue;
  }

  try {
    await import(pathToFileURL(fullPath));
  } catch (error) {
    fail(`${builtRoute} cannot be imported: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error("Backend safety verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Backend safety verification passed.");
