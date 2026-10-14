import { describe, expect, it } from "vitest";
import {
  canReproduce,
  documentSchema,
  elapsedSeconds,
  grade,
  itemSchema,
  optionsFor,
  publicItems,
  sourceUrl,
  validateAnswer,
  validateKey,
  type ExamSnapshot,
} from "./domain";
import { parseKeyCsv, parseKeyText } from "./import-key";
const item = (number = 1) =>
  itemSchema.parse({
    number,
    format: "mcq5",
    subject: "Matemática",
    sourceUrl: "",
    correct: "B",
    explanation: "O dobro de três é seis, pois 3 + 3 = 6.",
    explanationReviewed: true,
  });
const snapshot: ExamSnapshot = {
  institutionId: "enem",
  title: "Teste autoral",
  year: 2025,
  phase: "1",
  edition: "Regular",
  booklet: "Azul",
  day: "1",
  language: "Inglês",
  questionCount: 1,
  firstNumber: 1,
  durationMinutes: 60,
  allowPause: true,
  items: [item()],
};

describe("treino com gabarito em revisão", () => {
  it("nunca conta uma resposta sem gabarito como erro nem inventa nota", () => {
    const result = grade([{ ...item(), correct: "", explanation: "", explanationReviewed: false }], [{ number: 1, value: "B", reviewed: false }]);
    expect(result.wrong).toBe(0); expect(result.correct).toBe(0);
    expect(result.percentage).toBeNull(); expect(result.pending).toBe(1);
  });
});
describe("licenciamento", () => {
  it("não considera disponibilidade pública uma licença", () =>
    expect(
      canReproduce(
        documentSchema.parse({ sourceUrl: "https://example.org/exam.pdf" }),
      ),
    ).toBe(false));
  it("exige todas as evidências para reprodução", () => {
    const allowed = {
      ...documentSchema.parse({
        sourceUrl: "https://example.org/exam.pdf",
        rightsStatus: "permitted",
        commercialUseAllowed: true,
        reproductionAllowed: true,
        licenseDocument: "Autorização assinada",
      }),
      licenseId: "record",
      verifiedAt: new Date(),
    };
    expect(canReproduce(allowed)).toBe(true);
    for (const patch of [
      { rightsStatus: "pending" as const },
      { commercialUseAllowed: false },
      { reproductionAllowed: false },
      { licenseDocument: "" },
      { verifiedAt: null },
      { licenseId: null },
    ])
      expect(canReproduce({ ...allowed, ...patch })).toBe(false);
  });
  it("recusa URLs executáveis e credenciais", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://example.org",
      "https://user:pass@example.org",
    ])
      expect(sourceUrl.safeParse(url).success).toBe(false);
  });
});
describe("gabaritos", () => {
  it("valida um caderno completo", () =>
    expect(validateKey(snapshot)).toEqual([]));
  it("recusa lacunas e duplicatas", () =>
    expect(
      validateKey({ ...snapshot, questionCount: 2, items: [item(), item()] })
        .length,
    ).toBeGreaterThan(0));
  it("valida numeração que começa em 91", () =>
    expect(
      validateKey({ ...snapshot, firstNumber: 91, items: [item(91)] }),
    ).toEqual([]));
  it("exige explicação revisada", () =>
    expect(
      validateKey({
        ...snapshot,
        items: [{ ...item(), explanationReviewed: false }],
      }).join(),
    ).toContain("revisão"));
  it("respeita quatro alternativas e certo/errado", () => {
    expect(optionsFor("mcq4")).not.toContain("E");
    expect(optionsFor("boolean")).toEqual(["C", "E"]);
    expect(() => validateAnswer({ ...item(), format: "mcq4" }, "E")).toThrow();
    expect(() =>
      validateAnswer({ ...item(), format: "boolean" }, "B"),
    ).toThrow();
  });
  it("não entrega respostas ou explicações no DTO do aluno", () => {
    const result = publicItems([item()])[0];
    expect(result).not.toHaveProperty("correct");
    expect(result).not.toHaveProperty("explanation");
    expect(result).not.toHaveProperty("annulled");
  });
  it("não exige alternativa em anulada", () =>
    expect(
      validateKey({
        ...snapshot,
        items: [
          {
            ...item(),
            annulled: true,
            correct: "",
            explanation: "",
            explanationReviewed: false,
          },
        ],
      }),
    ).toEqual([]));
  it("exige resposta padrão em discursiva", () =>
    expect(
      validateKey({
        ...snapshot,
        items: [{ ...item(), format: "written", correct: "" }],
      }).length,
    ).toBeGreaterThan(0));
  it("suporta múltiplas páginas e impede recortes fora delas", () => {
    expect(
      itemSchema.safeParse({
        ...item(),
        regions: [
          { page: 1, x: 0, y: 0, width: 1, height: 1 },
          { page: 2, x: 0, y: 0, width: 1, height: 0.5 },
        ],
      }).success,
    ).toBe(true);
    expect(
      itemSchema.safeParse({
        ...item(),
        regions: [{ page: 1, x: 0.8, y: 0, width: 0.4, height: 1 }],
      }).success,
    ).toBe(false);
  });
});
describe("correção transparente", () => {
  it("separa acertos, erros, brancos, discursivas e anuladas", () => {
    const items = [
      item(1),
      item(2),
      item(3),
      { ...item(4), format: "written" as const },
      { ...item(5), annulled: true },
    ];
    const result = grade(items, [
      { number: 1, value: "B", reviewed: true },
      { number: 2, value: "C", reviewed: false },
      { number: 4, value: "Minha resposta", reviewed: false },
    ]);
    expect(result).toMatchObject({
      correct: 1,
      wrong: 1,
      unanswered: 1,
      pending: 1,
      annulled: 1,
      objectiveCount: 3,
      percentage: 33.3,
    });
    expect(result.subjects).toEqual([
      { subject: "Matemática", correct: 1, total: 3 },
    ]);
  });
  it("não inventa nota de discursivas", () =>
    expect(
      grade([{ ...item(), format: "written" }], []).percentage,
    ).toBeNull());
  it("omite explicação não revisada", () =>
    expect(
      grade([{ ...item(), explanationReviewed: false }], []).rows[0]
        .explanation,
    ).toBe(""));
  it("cronômetro é calculado no servidor e pausa não gasta tempo", () => {
    const now = new Date("2026-01-01T00:01:00Z");
    expect(
      elapsedSeconds(
        { elapsedSeconds: 20, activeSince: new Date("2026-01-01T00:00:00Z") },
        now,
      ),
    ).toBe(80);
    expect(elapsedSeconds({ elapsedSeconds: 20, activeSince: null }, now)).toBe(
      20,
    );
  });
});
describe("importação conservadora", () => {
  it("importa CSV e anulações sem aprovação automática", () =>
    expect(parseKeyCsv("numero,resposta\n1,A\n2,ANULADA")).toEqual([
      { number: 1, correct: "A", annulled: false },
      { number: 2, correct: "", annulled: true },
    ]));
  it("aceita CSV brasileiro e BOM", () =>
    expect(parseKeyCsv("\uFEFFnumero;resposta\n91;C")[0]).toMatchObject({
      number: 91,
      correct: "C",
    }));
  it("recusa números duplicados, respostas desconhecidas e arquivos vazios", () => {
    for (const input of ["1,A\n1,B", "1,F", ""])
      expect(() => parseKeyCsv(input)).toThrow();
  });
  it("não adivinha tabelas ambíguas extraídas de PDF", () => {
    expect(parseKeyText("1 2 3 4\nA B C D")).toEqual([]);
    expect(parseKeyText("1 - A\n2 E")).toHaveLength(2);
  });
});
