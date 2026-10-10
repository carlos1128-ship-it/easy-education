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

import { lettersLabel, normalizeQuizOptions, optionCountForStyle, quizQuestionsSchemaFor } from "@/lib/quiz-questions";

describe("alternativas A a E", () => {
  const five = {
    question: "Qual destes é um número primo maior que 10?",
    options: ["12", "13", "15", "21", "27"],
    correctAnswer: "B",
    explanation: "13 só é divisível por 1 e por ele mesmo; 15 é divisível por 3.",
  };

  it("ENEM, ETEC e bancas de 5 alternativas pedem A a E; o resto fica em A a D", () => {
    expect(optionCountForStyle("ENEM, com textos-base")).toBe(5);
    expect(optionCountForStyle("Vestibulinho da ETEC (Centro Paula Souza)")).toBe(5);
    expect(optionCountForStyle("concurso público, padrão FCC")).toBe(5);
    expect(optionCountForStyle("prova escolar do 9º ano")).toBe(4);
    expect(optionCountForStyle("Cebraspe")).toBe(4);
  });

  it("aceita 5 alternativas quando o formato pede 5, e recusa quando pede 4", () => {
    expect(sanitizeGeneratedQuizQuestions([five], 1, 5)).toHaveLength(1);
    expect(sanitizeGeneratedQuizQuestions([five], 1, 5)[0].options).toEqual(["A) 12", "B) 13", "C) 15", "D) 21", "E) 27"]);
    expect(sanitizeGeneratedQuizQuestions([five], 1, 4)).toHaveLength(0);
  });

  it("gabarito E só vale com 5 alternativas", () => {
    const e = { ...five, correctAnswer: "E", options: ["12", "15", "21", "27", "13"] };
    expect(sanitizeGeneratedQuizQuestions([e], 1, 5)[0].correctAnswer).toBe("E");
    expect(sanitizeGeneratedQuizQuestions([{ ...e, options: e.options.slice(0, 4) }], 1, 4)).toHaveLength(0);
  });

  it("questão salva mantém quantas alternativas tinha (4 antigas, 5 novas)", () => {
    expect(normalizeQuizOptions(["A) 1", "B) 2", "C) 3", "D) 4"])).toHaveLength(4);
    expect(normalizeQuizOptions(["A) 1", "B) 2", "C) 3", "D) 4", "E) 5"])).toHaveLength(5);
  });

  it("esquema e texto do prompt acompanham o número de alternativas", () => {
    const schema = quizQuestionsSchemaFor(5) as { items: { properties: { correctAnswer: { enum: string[] }; options: { maxItems: string } } } };
    expect(schema.items.properties.correctAnswer.enum).toEqual(["A", "B", "C", "D", "E"]);
    expect(schema.items.properties.options.maxItems).toBe("5");
    expect(lettersLabel(5)).toBe("A, B, C, D e E");
    expect(lettersLabel(4)).toBe("A, B, C e D");
  });
});

import { ETEC_STYLE, examStyleFromPersonalization, goalLabel, isEtecStudent } from "@/lib/learner-profile";

describe("Vestibulinho da ETEC", () => {
  it("objetivo, estilo e 5 alternativas", () => {
    const p = { purpose: "etec" as const, schoolYear: "9º ano" };
    expect(goalLabel(p)).toBe("Vestibulinho ETEC");
    expect(examStyleFromPersonalization(p)).toBe(ETEC_STYLE);
    expect(optionCountForStyle(ETEC_STYLE)).toBe(5);
    expect(isEtecStudent(p)).toBe(true);
    expect(isEtecStudent({ purpose: "escola" })).toBe(false);
  });
});
