import { describe, expect, it } from "vitest";
import { bankSubjectsFor, fitsQuizFormat } from "@/lib/bank/quiz-fallback";

describe("bankSubjectsFor", () => {
  it("reconhece a matéria do jeito que o aluno escreve", () => {
    expect(bankSubjectsFor("Matematica")).toEqual(["matematica"]);
    expect(bankSubjectsFor("Física, Química")).toEqual(["fisica", "quimica"]);
    expect(bankSubjectsFor("Português", "interpretação de texto")).toEqual(["lingua-portuguesa"]);
    expect(bankSubjectsFor("Ciências")).toEqual(["fisica", "quimica", "biologia"]);
  });

  it("não inventa matéria que o banco não tem", () => {
    expect(bankSubjectsFor("Direito Constitucional")).toEqual([]);
  });
});

describe("fitsQuizFormat", () => {
  const base = { supportText: "Texto", statement: "Pergunta?", images: [], options: [{ text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }] };

  it("aceita questão só de texto", () => {
    expect(fitsQuizFormat(base)).toBe(true);
  });

  it("recusa figura, tabela e alternativa em imagem", () => {
    expect(fitsQuizFormat({ ...base, images: ["https://x/1.jpg"] })).toBe(false);
    expect(fitsQuizFormat({ ...base, supportText: "Veja\n| a | b |\n| --- | --- |" })).toBe(false);
    expect(fitsQuizFormat({ ...base, options: [{ text: "" }, { text: "b" }, { text: "c" }, { text: "d" }] })).toBe(false);
  });
});
