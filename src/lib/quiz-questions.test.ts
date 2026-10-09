import { describe, expect, it } from "vitest";
import { generateQuizQuestions, isUsableGeneratedQuestion, sanitizeGeneratedQuizQuestions } from "@/lib/quiz-questions";

const good = (n: number) => ({
  question: `Um estudante faz ${n} exercícios por dia durante uma semana. Quantos faz no total?`,
  options: [`${n * 5}`, `${n * 6}`, `${n * 7}`, `${n * 8}`],
  correctAnswer: "C",
  explanation: `Uma semana tem 7 dias: ${n} × 7 = ${n * 7}.`,
});

describe("validação das questões geradas pela IA", () => {
  it("aceita questão completa, inclusive alternativas numéricas curtas", () => {
    expect(isUsableGeneratedQuestion(good(1))).toBe(true);
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["2", "3", "4", "6"] })).toBe(true);
  });

  it("recusa alternativas que são só a letra (o bug do quiz de vídeo)", () => {
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["A", "B", "C", "D"] })).toBe(false);
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["A)", "B)", "C)", "D)"] })).toBe(false);
  });

  it("recusa alternativas repetidas, faltando ou placeholder e enunciado vazio", () => {
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["x = 1", "x = 2", "x = 1", "x = 3"] })).toBe(false);
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["1", "2", "3"] })).toBe(false);
    expect(isUsableGeneratedQuestion({ ...good(1), options: ["Alternativa correta", "2", "3", "4"] })).toBe(false);
    expect(isUsableGeneratedQuestion({ ...good(1), question: "" })).toBe(false);
  });

  it("tira a letra que a IA põe na frente e coloca a do app", () => {
    const [question] = sanitizeGeneratedQuizQuestions([{ ...good(2), options: ["A) 10", "B) 12", "C) 14", "D) 16"] }], 1);
    expect(question.options).toEqual(["A) 10", "B) 12", "C) 14", "D) 16"]);
  });

  it("pede de novo só as questões que vieram quebradas", async () => {
    const calls: number[] = [];
    const result = await generateQuizQuestions(4, async (missing) => {
      calls.push(missing);
      if (calls.length === 1) return [good(1), good(2), { ...good(3), options: ["A", "B", "C", "D"] }, { ...good(4), options: ["A", "B", "C", "D"] }];
      return [good(5), good(6)];
    });
    expect(calls).toEqual([4, 2]);
    expect(result).toHaveLength(4);
  });

  it("desiste com erro se a IA não entrega o mínimo", async () => {
    await expect(generateQuizQuestions(10, async () => [{ ...good(1), options: ["A", "B", "C", "D"] }])).rejects.toThrow();
  });
});

describe("conferência e reaproveitamento", () => {
  it("só entram as questões aprovadas na conferência às cegas, e as faltantes são pedidas de novo", async () => {
    const approved: unknown[] = [];
    let rounds = 0;
    const result = await generateQuizQuestions(
      3,
      async (missing) => Array.from({ length: missing }, (_, i) => good(10 + i + missing * 10)),
      {
        // Reprova a primeira questão da primeira rodada; a rodada seguinte repõe a que faltou.
        verify: async (questions) => ({ items: (rounds += 1) === 1 ? questions.slice(1) : questions, verified: true }),
        onVerified: (questions) => approved.push(...questions),
      },
    );
    expect(result).toHaveLength(3);
    expect(approved).toHaveLength(3);
  });

  it("chave do banco compartilhado ignora acentos e maiúsculas", async () => {
    const { poolKey, copiesReference } = await import("@/lib/question-pool");
    expect(poolKey({ subject: "Biologia", topic: "Genética", style: "ENEM", difficulty: "medio" })).toEqual(
      poolKey({ subject: "biologia", topic: "genetica", style: "enem", difficulty: "medio" }),
    );
    const reference = "Um pesquisador cruzou plantas de ervilha de sementes amarelas com plantas de sementes verdes e obteve";
    expect(copiesReference({ ...good(1), question: `${reference} apenas amarelas. Isso indica` }, [reference])).toBe(true);
    expect(copiesReference(good(1), [reference])).toBe(false);
  });
});
