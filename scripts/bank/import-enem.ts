/**
 * Importa questões do ENEM para o banco (sem IA). Fonte: API pública enem.dev, que transcreve as provas
 * oficiais do INEP. Fonte e licença: docs/fontes-questoes.md.
 *
 *   npx tsx --env-file=.env.local scripts/bank/import-enem.ts --years 2022,2023 --sample 100 --batch piloto
 *   npx tsx --env-file=.env.local scripts/bank/import-enem.ts --years 2022 --all --batch ano-2022
 *
 * - O texto das questões entra exatamente como veio (CC BY-ND: sem modificar).
 * - Questão sem gabarito, incompleta ou com imagem quebrada NÃO é importada (fica no relatório).
 * - Importa como NÃO publicada: só vai para os alunos depois da classificação (classify.ts) validar a resolução.
 * - Pode rodar de novo: o que já existe é ignorado.
 */
import { ENEM_SOURCE } from "@/lib/bank/constants";
import { normalizeEnemDevQuestion, type EnemDevQuestion, type NormalizedQuestion } from "@/lib/bank/import";
import { ensureCatalog } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";

const API = "https://api.enem.dev/v1";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Gerador pseudoaleatório com semente: o mesmo piloto sai igual toda vez. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status} em ${url}`);
  return (await response.json()) as T;
}

async function fetchYear(year: number) {
  const all: EnemDevQuestion[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await fetchJson<{ metadata: { hasMore: boolean }; questions: EnemDevQuestion[] }>(`${API}/exams/${year}/questions?limit=50&offset=${offset}`);
    all.push(...page.questions);
    if (!page.metadata.hasMore) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return all;
}

async function imageOk(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
    return response.ok && (response.headers.get("content-type") ?? "").startsWith("image/");
  } catch {
    return false;
  }
}

async function main() {
  const years = (arg("years") ?? "2022").split(",").map((item) => Number(item.trim())).filter(Boolean);
  const sample = Number(arg("sample") ?? 0);
  const batch = arg("batch") ?? `import-${new Date().toISOString().slice(0, 10)}`;
  if (!sample && !flag("all")) throw new Error("Use --sample N (piloto) ou --all.");

  await ensureCatalog();
  const prisma = getPrisma();
  const exam = await prisma.exam.findUniqueOrThrow({ where: { slug: "enem" } });

  const rejected: Record<string, number> = {};
  const reject = (reason: string) => {
    rejected[reason] = (rejected[reason] ?? 0) + 1;
  };

  const candidates: NormalizedQuestion[] = [];
  for (const year of years) {
    const questions = await fetchYear(year);
    console.log(`ENEM ${year}: ${questions.length} questões na fonte`);
    for (const source of questions) {
      const result = normalizeEnemDevQuestion(source);
      if (!result.ok) reject(result.reason);
      else candidates.push(result.question);
    }
  }

  // Piloto: o mesmo número de questões por área, escolhidas com semente fixa.
  let chosen = candidates;
  if (!flag("all")) {
    const random = seeded(2026);
    const byArea = new Map<string, typeof candidates>();
    for (const item of candidates) byArea.set(item.area, [...(byArea.get(item.area) ?? []), item]);
    const perArea = Math.ceil(sample / byArea.size);
    chosen = [...byArea.values()].flatMap((items) => items.map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).slice(0, perArea).map((entry) => entry.item)).slice(0, sample);
  }

  let imported = 0;
  let existing = 0;
  for (const question of chosen) {
    // Imagem quebrada: não importa (a questão não seria resolvível).
    const checks = await Promise.all(question.images.map(imageOk));
    if (checks.some((ok) => !ok)) {
      reject("imagem quebrada ou inacessível na fonte");
      continue;
    }
    const where = { examId_year_edition_number_variant_origin_ownerUserId: { examId: exam.id, year: question.year, edition: "", number: question.number, variant: question.variant, origin: "prova_oficial", ownerUserId: "" } };
    if (await prisma.bankQuestion.findUnique({ where })) {
      existing += 1;
      continue;
    }
    await prisma.bankQuestion.create({
      data: {
        examId: exam.id,
        year: question.year,
        number: question.number,
        variant: question.variant,
        area: question.area,
        statement: question.statement,
        supportText: question.supportText,
        images: question.images,
        options: question.options,
        correctLabel: question.correctLabel,
        origin: "prova_oficial",
        sourceName: ENEM_SOURCE.name,
        sourceUrl: ENEM_SOURCE.url,
        license: ENEM_SOURCE.license,
        isPublished: false,
        importBatch: batch,
      },
    });
    imported += 1;
  }

  console.log(`\nLote "${batch}": ${imported} importadas, ${existing} já existiam.`);
  if (Object.keys(rejected).length) console.log("Não importadas:", rejected);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
