import { describe, expect, it } from "vitest";
import { generateQuizQuestions, isUsableGeneratedQuestion, sanitizeGeneratedQuizQuestions } from "@/lib/quiz-questions";

/** Palavra única por número (só letras), para cada questão de teste ser de fato diferente das outras. */
const word = (n: number) => n.toString(26).split("").map((digit) => String.fromCharCode(97 + parseInt(digit, 26))).join("").padStart(4, "q");

const good = (n: number) => ({
  question: `Um estudante de ${word(n)}xa faz ${n} exercícios de ${word(n + 7)}yb, ${word(n + 13)}zc, ${word(n + 19)}wd, ${word(n + 23)}ve e ${word(n + 29)}uf por dia durante uma semana. Quantos faz no total?`,
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
    // 1ª rodada pede 10% a mais (4 → 5); a reposição pede 25% + 1 (2 → 4).
    expect(calls).toEqual([5, 4]);
    expect(result).toHaveLength(4);
  });

  it("simulado de 90: a conferência descarta algumas e mesmo assim chegam as 90 (antes vinham 89)", async () => {
    let n = 0;
    const result = await generateQuizQuestions(
      90,
      async (missing) => Array.from({ length: missing }, () => good(1000 + (n += 1))),
      // Reprova 1 a cada 20 questões, como a conferência às cegas costuma fazer.
      { verify: async (questions) => ({ items: questions.filter((_, i) => i % 20 !== 7), verified: true }) },
    );
    expect(result).toHaveLength(90);
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

import { balanceCorrectLetters, remapLetterMentions } from "@/lib/quiz-questions";

describe("gabarito espalhado entre as letras", () => {
  const make = (i: number) => ({
    question: `Questão ${i}: qual é o resultado de ${i} + 1 numa conta simples?`,
    options: [`A) ${i + 1}`, `B) ${i + 2}`, `C) ${i + 3}`, `D) ${i + 4}`, `E) ${i + 5}`],
    correctAnswer: "A",
    explanation: `A alternativa A está certa porque ${i} + 1 = ${i + 1}; a letra B soma 2. (C) soma 3.`,
  });

  it("20 questões todas com gabarito A viram 4 de cada letra, sem trocar a resposta", () => {
    const result = balanceCorrectLetters(Array.from({ length: 20 }, (_, i) => make(i)));
    const counts: Record<string, number> = {};
    for (const [i, question] of result.entries()) {
      counts[question.correctAnswer] = (counts[question.correctAnswer] ?? 0) + 1;
      const right = question.options.find((option) => option.startsWith(`${question.correctAnswer})`));
      expect(right).toBe(`${question.correctAnswer}) ${i + 1}`);
      expect(question.options.map((option) => option.charAt(0))).toEqual(["A", "B", "C", "D", "E"]);
      expect(new Set(question.options.map((option) => option.slice(3))).size).toBe(5);
    }
    expect(Object.values(counts)).toEqual([4, 4, 4, 4, 4]);
  });

  it("as letras citadas na explicação acompanham a troca", () => {
    const [question] = balanceCorrectLetters([make(1)], () => 0.99);
    const right = question.correctAnswer;
    expect(question.explanation).toContain(`alternativa ${right} está certa`);
    expect(remapLetterMentions("Veja a letra b e a opção C (D).", { B: "E", C: "A", D: "B" })).toBe("Veja a letra e e a opção A (B).");
  });
});

import { explanationContradictsAnswer } from "@/lib/quiz-questions";

describe("explicação que contradiz o gabarito", () => {
  const chuveiro = {
    question: "Um chuveiro de 5 kW é usado 30 minutos por dia; a 1 kWh custa R$ 0,50. Qual o custo mensal em 30 dias?",
    options: ["A) R$ 25,00", "B) R$ 50,00", "C) R$ 75,00", "D) R$ 150,00", "E) R$ 37,50"],
    correctAnswer: "C",
    explanation: "E = 5 kW x 0,5 h = 2,5 kWh por dia; 2,5 x 30 = 75 kWh; custo = 75 x 0,50 = R$ 37,50.",
  };
  it("pega o caso real da bateria (gabarito 75, explicação chega a 37,50)", () => {
    expect(explanationContradictsAnswer(chuveiro)).toBe(true);
  });
  it("não reprova quando o gabarito está certo", () => {
    expect(explanationContradictsAnswer({ ...chuveiro, correctAnswer: "E" })).toBe(false);
  });
  it("ignora questões que não são de resposta numérica", () => {
    expect(explanationContradictsAnswer({ question: "x", options: ["A) Mitose", "B) Meiose", "C) Fissão", "D) Brotamento"], correctAnswer: "A", explanation: "Ocorre em 2 etapas." })).toBe(false);
  });
});

describe("explicação que contradiz o gabarito (casos de borda)", () => {
  it("comentar o distrator no fim não reprova uma questão certa", () => {
    expect(
      explanationContradictsAnswer({
        question: "Quanto é 2,5 x 30 x 0,50?",
        options: ["A) 25", "B) 50", "C) 75", "D) 150", "E) 37,5"],
        correctAnswer: "E",
        explanation: "2,5 x 30 = 75; 75 x 0,50 = 37,5. A alternativa B (50) erra porque esquece a tarifa.",
      }),
    ).toBe(false);
  });
});

import { isNearDuplicate, questionFingerprint } from "@/lib/quiz-questions";

describe("questões quase repetidas", () => {
  const chuveiro = (w: number) => ({
    question: `Um aluno precisa calcular o consumo de energia elétrica de um chuveiro de ${w} W ligado durante 30 minutos por dia em um mês de 30 dias. Qual é o consumo em kWh?`,
    options: ["A) 82,5 kWh", "B) 81 kWh", "C) 165 kWh", "D) 2750 kWh", "E) 41 kWh"],
  });
  it("o mesmo chuveiro com outra potência conta como repetida (caso real da bateria)", () => {
    expect(isNearDuplicate(questionFingerprint(chuveiro(5500)), questionFingerprint(chuveiro(5400)))).toBe(true);
  });
  it("mesmo enunciado padrão de banca com alternativas diferentes não conta", () => {
    const a = { question: "Assinale a alternativa que apresenta a correta concordância verbal, de acordo com a norma-padrão.", options: ["A) Fazem dois anos que saí.", "B) Houveram muitos problemas.", "C) Existem várias soluções.", "D) Haviam pessoas na sala."] };
    const b = { question: "Assinale a alternativa que apresenta a correta concordância verbal, de acordo com a norma-padrão.", options: ["A) Os Estados Unidos é potência.", "B) Vossa Excelência estais certo.", "C) A maioria dos alunos saiu cedo.", "D) Choveu pedras ontem à tarde."] };
    expect(isNearDuplicate(questionFingerprint(a), questionFingerprint(b))).toBe(false);
  });
  it("a mesma situação perguntada de outro jeito conta (água e óleo, caso real da bateria)", () => {
    const a = { question: "Durante uma aula de laboratório, um estudante misturou água e óleo de cozinha em um béquer. Observou-se que os dois líquidos não se misturaram, formando duas camadas distintas, sendo que o óleo ficou em cima. Qual propriedade explica isso?", options: ["A) Densidade", "B) Temperatura", "C) Massa total", "D) Cor", "E) Volume"] };
    const b = { question: "Durante uma aula de laboratório, um estudante misturou água e óleo de cozinha em um béquer. O óleo flutuou sobre a água, formando duas fases distintas. Esse fenômeno físico ocorre porque:", options: ["A) o óleo é menos denso", "B) a água ferve", "C) o óleo é mais pesado", "D) a água evapora", "E) o óleo é metálico"] };
    expect(isNearDuplicate(questionFingerprint(a), questionFingerprint(b))).toBe(true);
  });
});
