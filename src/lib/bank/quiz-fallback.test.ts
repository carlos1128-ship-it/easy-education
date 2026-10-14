import { describe, expect, it } from "vitest";
import { bankSubjectsFor, fitsQuizFormat, interleaveBySubject } from "@/lib/bank/quiz-fallback";

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

describe("simulado com várias matérias", () => {
  it("reveza as matérias em vez de encher com a que tem mais questões", () => {
    const rows = [
      ...Array.from({ length: 6 }, (_, index) => ({ id: `m${index}`, subject: { slug: "matematica" } })),
      { id: "h0", subject: { slug: "historia" } },
      { id: "h1", subject: { slug: "historia" } },
    ];
    expect(interleaveBySubject(rows, 5).map((row) => row.id)).toEqual(["m0", "h0", "m1", "h1", "m2"]);
    expect(interleaveBySubject(rows, 20)).toHaveLength(8);
  });
  it("uma matéria só mantém a ordem", () => {
    const rows = [{ id: "a", subject: { slug: "fisica" } }, { id: "b", subject: { slug: "fisica" } }];
    expect(interleaveBySubject(rows, 1).map((row) => row.id)).toEqual(["a"]);
  });
});
