/**
 * Passo 1 da importação do Vestibulinho ETEC e do Vestibular FATEC (--exam fatec): transcreve o caderno oficial (PDF) em JSON com a IA, sem o
 * gabarito (ele vem do PDF oficial de gabarito, no passo 2: import-etec.ts). Fonte: docs/fontes-questoes.md.
 *
 *   npx tsx --env-file=.env.local scripts/bank/extract-etec.ts --dir ./etec --out ./etec/json
 *
 * Em --dir ficam os pares <codigo>-prova.pdf e <codigo>-gabarito.pdf baixados de
 * https://vestibulinho.etec.sp.gov.br/provas-gabaritos/. A IA devolve o texto exatamente como na prova
 * (sem resumir nem corrigir) e, para cada figura, a página e a caixa onde ela está, para o passo 2 recortar.
 * Já transcrito (arquivo em --out) não é refeito.
 */
import fs from "node:fs";
import path from "node:path";
import { Type, type Schema } from "@google/genai";
import { PDFParse } from "pdf-parse";
import { CPS_EXAMS, etecQuestionCount, parseKeyVersions } from "@/lib/bank/etec";
import { getGemini } from "@/lib/gemini";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

const MODELS = (process.env.ETEC_MODELS ?? "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-2.5-flash").split(",");

const figure: Schema = {
  type: Type.OBJECT,
  properties: {
    page: { type: Type.INTEGER, description: "Página do PDF (1 = primeira)" },
    box: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "[ymin, xmin, ymax, xmax] de 0 a 1000 na página" },
  },
  required: ["page", "box"],
};

const schema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      number: { type: Type.INTEGER },
      supportText: { type: Type.STRING, description: "Texto de apoio usado pela questão (inclusive o texto compartilhado por várias questões), exatamente como na prova. Vazio se não houver." },
      statement: { type: Type.STRING, description: "O comando/pergunta da questão, exatamente como na prova." },
      options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Texto das alternativas A a E, na ordem, sem a letra. Vazio se a alternativa for só imagem." },
      figures: { type: Type.ARRAY, items: figure, description: "Figuras, gráficos, tabelas desenhadas, mapas ou charges que a questão usa (fora as alternativas)." },
      optionFigures: { type: Type.ARRAY, items: figure, description: "Se as alternativas forem imagens: uma caixa por alternativa, na ordem A a E. Senão, lista vazia." },
      tableMarkdown: { type: Type.STRING, description: "Se houver tabela simples de texto, a tabela em markdown. Senão, vazio." },
    },
    required: ["number", "supportText", "statement", "options", "figures", "optionFigures"],
  },
};

const PROMPT = (from: number, to: number, examName: string) => `Você recebe o caderno oficial de uma prova do ${examName}, em PDF com duas colunas.
Transcreva as questões de ${from} a ${to}, uma por item, EXATAMENTE como estão na prova: mesmas palavras, mesma pontuação,
sem resumir, sem corrigir e sem acrescentar nada. Reconstrua a ordem de leitura das colunas corretamente.
Regras:
- Se um texto serve para várias questões ("Leia o texto para responder às questões 06 a 09"), repita esse texto em supportText de CADA uma delas.
- Mantenha parágrafos separados por linha em branco e versos de poema em linhas separadas.
- Inclua a fonte do texto (ex.: "<https://...> Acesso em: ...") no fim do supportText, como na prova.
- Fórmulas e números: transcreva em texto simples (ex.: "x² + 3x", "H2O" como "H₂O" se for subscrito).
- Para cada figura (imagem, gráfico, mapa, charge, tirinha, tabela desenhada, esquema) que a questão usa, informe a página do PDF e a caixa [ymin, xmin, ymax, xmax] em escala 0 a 1000, incluindo a legenda da figura. Não descreva a figura no texto.
- Se as alternativas forem imagens, deixe o texto delas vazio e dê uma caixa por alternativa em optionFigures.
- Não inclua o cabeçalho/rodapé das páginas, nem instruções gerais da prova.
Responda só com o JSON.`;

async function transcribe(pdf: Buffer, from: number, to: number, examName: string) {
  let lastError: unknown;
  for (const model of MODELS) {
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } }, { text: PROMPT(from, to, examName) }] }],
        config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0, maxOutputTokens: 60000 },
      });
      const items = JSON.parse(response.text ?? "[]") as Array<{ number: number }>;
      const wanted = items.filter((item) => item.number >= from && item.number <= to);
      if (wanted.length < to - from + 1) throw new Error(`${model}: vieram ${wanted.length} de ${to - from + 1} questões`);
      console.log(`  ${from}-${to}: ${model} ok`);
      return wanted;
    } catch (error) {
      lastError = error;
      console.warn(`  ${from}-${to}: ${model} falhou: ${error instanceof Error ? error.message.slice(0, 200) : error}`);
    }
  }
  throw lastError;
}

async function main() {
  const dir = arg("dir");
  const out = arg("out");
  if (!dir || !out) throw new Error("Use --dir <pasta com os PDFs> --out <pasta dos JSON>.");
  fs.mkdirSync(out, { recursive: true });
  const only = arg("only");
  // --name para provas fora do Centro Paula Souza (ex.: "Vestibular da UNESP (Vunesp)").
  const exam = (arg("exam") ?? "etec") as keyof typeof CPS_EXAMS;
  const examName = arg("name") ?? CPS_EXAMS[exam]?.name;
  if (!examName) throw new Error("Use --exam etec|fatec ou --name \"Nome da prova\".");

  const concurrency = Math.max(1, Number(arg("concurrency") ?? 3));
  const pending = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith("-prova.pdf"))
    .sort()
    .map((file) => file.replace("-prova.pdf", ""))
    .filter((code) => (!only || code === only) && !fs.existsSync(path.join(out, `${code}.json`)));

  const run = async (code: string) => {
    console.log(`Caderno ${code}`);
    const pdf = fs.readFileSync(path.join(dir, `${code}-prova.pdf`));
    // Total de questões pelo gabarito oficial (há caderno de 40); sem gabarito legível, --total.
    const key = await new PDFParse({ data: fs.readFileSync(path.join(dir, `${code}-gabarito.pdf`)) }).getText();
    const versionMax = Math.max(0, ...parseKeyVersions(key.text).flatMap((version) => [...version.keys()]));
    const total = Math.max(etecQuestionCount(key.text), versionMax) || Number(arg("total") ?? 50);
    const parts = Math.max(3, Math.ceil(total / 18));
    const step = Math.ceil(total / parts);
    const ranges: Array<[number, number]> = [];
    for (let from = 1; from <= total; from += step) ranges.push([from, Math.min(total, from + step - 1)]);
    // As partes do mesmo caderno vão juntas.
    const questions = (await Promise.all(ranges.map(([from, to]) => transcribe(pdf, from, to, examName)))).flat();
    fs.writeFileSync(path.join(out, `${code}.json`), JSON.stringify(questions, null, 1));
    console.log(`Caderno ${code}: ${questions.length} questões`);
  };

  // Alguns cadernos ao mesmo tempo; um que falhe não para os outros.
  const queue = [...pending];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let code = queue.shift(); code; code = queue.shift()) {
        await run(code).catch((error) => console.error(`Caderno ${code} falhou: ${error instanceof Error ? error.message.slice(0, 200) : error}`));
      }
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
