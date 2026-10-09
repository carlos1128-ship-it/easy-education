import { describe, expect, it } from "vitest";
import { ESTIMATE_DISCLAIMER, estimateAreaScore, estimateOverallScore, percent } from "@/lib/bank/estimate";
import { collectImages, normalizeEnemDevQuestion, type EnemDevQuestion } from "@/lib/bank/import";
import { sourceLabel } from "@/lib/bank/labels";
import { intervalLabel, nextSchedule } from "@/lib/bank/spaced";
import { ENEM_DAYS, PER_AREA, pickPreferringUnseen } from "@/lib/bank/enem-simulado";
import { concursoTarget, isEnemStudent } from "@/lib/learner-profile";

const NOW = new Date("2026-10-09T12:00:00Z");

function question(overrides: Partial<EnemDevQuestion> = {}): EnemDevQuestion {
  return {
    title: "Questão 1 - ENEM 2022",
    index: 1,
    discipline: "matematica",
    language: null,
    year: 2022,
    context: "Texto de apoio.",
    files: [],
    correctAlternative: "B",
    alternativesIntroduction: "Qual é a resposta?",
    alternatives: ["A", "B", "C", "D", "E"].map((letter) => ({ letter, text: `Opção ${letter}`, file: null, isCorrect: letter === "B" })),
    ...overrides,
  };
}

describe("repetição espaçada das questões", () => {
  const fresh = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };

  it("errou de novo: volta amanhã e a sequência recomeça", () => {
    const next = nextSchedule({ easeFactor: 2.5, intervalDays: 12, repetitions: 4 }, "again", NOW);
    expect(next.intervalDays).toBe(1);
    expect(next.repetitions).toBe(0);
    expect(next.easeFactor).toBeCloseTo(2.3, 5);
    expect(next.nextReview.toISOString()).toBe("2026-10-10T12:00:00.000Z");
  });

  it("acertos seguidos espaçam cada vez mais: 1 dia, 3 dias, depois cresce pela facilidade", () => {
    const first = nextSchedule(fresh, "good", NOW);
    expect(first.intervalDays).toBe(1);
    const second = nextSchedule(first, "good", NOW);
    expect(second.intervalDays).toBe(3);
    const third = nextSchedule(second, "good", NOW);
    expect(third.intervalDays).toBe(Math.round(3 * 2.5));
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
  });

  it("fácil espaça mais que bom, e difícil menos", () => {
    const state = { easeFactor: 2.5, intervalDays: 3, repetitions: 2 };
    expect(nextSchedule(state, "easy", NOW).intervalDays).toBeGreaterThan(nextSchedule(state, "good", NOW).intervalDays);
    expect(nextSchedule(state, "hard", NOW).intervalDays).toBeLessThan(nextSchedule(state, "good", NOW).intervalDays);
  });

  it("a facilidade nunca cai abaixo de 1,3", () => {
    let state = fresh;
    for (let i = 0; i < 20; i += 1) state = nextSchedule(state, "again", NOW);
    expect(state.easeFactor).toBe(1.3);
  });

  it("textos dos intervalos", () => {
    expect(intervalLabel(1)).toBe("amanhã");
    expect(intervalLabel(5)).toBe("em 5 dias");
    expect(intervalLabel(60)).toBe("em 2 meses");
  });
});

describe("estimativa de nota", () => {
  it("é uma faixa numa escala de 300 a 900, nunca fora dela", () => {
    expect(estimateAreaScore(0, 45)).toEqual({ mid: 300, low: 300, high: 350 });
    expect(estimateAreaScore(45, 45)).toEqual({ mid: 900, low: 850, high: 900 });
    const half = estimateAreaScore(20, 40)!;
    expect(half.mid).toBe(600);
    expect(half.high - half.low).toBe(100);
  });

  it("sem questões não há estimativa", () => {
    expect(estimateAreaScore(0, 0)).toBeNull();
    expect(estimateOverallScore([])).toBeNull();
  });

  it("a média ignora áreas sem questões", () => {
    const overall = estimateOverallScore([
      { correct: 45, total: 45 },
      { correct: 0, total: 0 },
    ]);
    expect(overall?.mid).toBe(900);
  });

  it("o aviso nunca chama de nota TRI", () => {
    expect(ESTIMATE_DISCLAIMER.toLowerCase()).toContain("sem usar a tri");
    expect(ESTIMATE_DISCLAIMER).toContain("Estimativa baseada no seu desempenho");
  });

  it("percentual", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});

describe("rótulo da fonte", () => {
  const exam = { name: "ENEM", styleLabel: "ENEM" };
  it("prova oficial mostra prova, ano e número", () => {
    expect(sourceLabel({ origin: "prova_oficial", year: 2022, number: 45, exam })).toBe("ENEM 2022, Questão 45");
    expect(sourceLabel({ origin: "prova_oficial", year: 2022, number: 3, variant: "ingles", exam })).toBe("ENEM 2022, Questão 3 (Inglês)");
  });
  it("questão de IA nunca aparece como questão de prova", () => {
    expect(sourceLabel({ origin: "gerada_ia", year: 0, number: 0, exam })).toBe("Gerada por IA");
  });
});

describe("importação sem alterar o conteúdo", () => {
  it("mantém enunciado e alternativas exatamente como vieram", () => {
    const result = normalizeEnemDevQuestion(question());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.question.statement).toBe("Qual é a resposta?");
      expect(result.question.options.map((option) => option.text)).toEqual(["Opção A", "Opção B", "Opção C", "Opção D", "Opção E"]);
      expect(result.question.correctLabel).toBe("B");
    }
  });

  it("recusa questão sem gabarito (anulada)", () => {
    expect(normalizeEnemDevQuestion(question({ correctAlternative: null }))).toEqual({ ok: false, reason: "sem gabarito (questão anulada ou sem resposta oficial)" });
  });

  it("recusa alternativas incompletas", () => {
    const incomplete = question({ alternatives: question().alternatives.slice(0, 4) });
    expect(normalizeEnemDevQuestion(incomplete).ok).toBe(false);
  });

  it("alternativa só com imagem é válida", () => {
    const base = question();
    const withImage = question({ alternatives: base.alternatives.map((alt) => ({ ...alt, text: "", file: `https://exemplo.com/${alt.letter}.png` })) });
    expect(normalizeEnemDevQuestion(withImage).ok).toBe(true);
  });

  it("recusa questão cuja imagem a fonte marcou como quebrada", () => {
    const broken = question({ context: "Veja ![](https://enem.dev/broken-image.svg)" });
    expect(normalizeEnemDevQuestion(broken)).toEqual({ ok: false, reason: "imagem faltando na fonte (figura quebrada)" });
    const inAlternative = question({ alternatives: question().alternatives.map((alt, index) => (index === 0 ? { ...alt, file: "https://enem.dev/broken-image.svg" } : alt)) });
    expect(normalizeEnemDevQuestion(inAlternative).ok).toBe(false);
  });

  it("junta as imagens do texto de apoio, dos arquivos e das alternativas sem repetir", () => {
    const urls = collectImages({
      context: "Veja ![](https://exemplo.com/a.png) e de novo ![](https://exemplo.com/a.png) e ![](https://exemplo.com/b.png)",
      files: ["https://exemplo.com/a.png"],
      alternatives: [{ letter: "A", text: null, file: "https://exemplo.com/c.png", isCorrect: false }],
    });
    expect(urls.sort()).toEqual(["https://exemplo.com/a.png", "https://exemplo.com/b.png", "https://exemplo.com/c.png"]);
  });
});

describe("simulado de provas anteriores do ENEM", () => {
  it("prefere as questões que o aluno ainda não respondeu e não repete", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ id: `q${index}` }));
    const seen = new Set(["q0", "q1", "q2", "q3", "q4", "q5", "q6"]);
    const picked = pickPreferringUnseen(rows, seen, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((row) => row.id)).size).toBe(5);
    expect(picked.slice(0, 3).every((row) => !seen.has(row.id))).toBe(true);
  });

  it("só quem escolheu o ENEM vê as provas anteriores do ENEM", () => {
    expect(isEnemStudent({ purpose: "enem_vestibular", exam: "ENEM" })).toBe(true);
    expect(isEnemStudent({ purpose: "enem_vestibular" })).toBe(true);
    expect(isEnemStudent({ purpose: "enem_vestibular", exam: "Fuvest" })).toBe(false);
    expect(isEnemStudent({ purpose: "concurso", role: "Polícia Federal" })).toBe(false);
    expect(isEnemStudent(null)).toBe(false);
  });

  it("concurso: lê cargo e banca da personalização", () => {
    expect(concursoTarget({ purpose: "concurso", role: "INSS técnico", board: "Cebraspe" })).toEqual({ role: "INSS técnico", board: "Cebraspe" });
    expect(concursoTarget({ purpose: "concurso", board: "Ainda não sei" })).toEqual({ role: null, board: null });
    expect(concursoTarget({ purpose: "escola" })).toBeNull();
  });

  it("os dias somam 90 questões e a prova completa, 180", () => {
    expect(ENEM_DAYS.dia1.areas.length * PER_AREA).toBe(90);
    expect(ENEM_DAYS.dia2.areas.length * PER_AREA).toBe(90);
    expect(ENEM_DAYS.completo.areas.length * PER_AREA).toBe(180);
  });
});

describe("idioma das questões", () => {
  it("só gera no idioma estudado quando a matéria é o próprio idioma", async () => {
    const { examStyleFromPersonalization, isLanguageSubject } = await import("@/lib/learner-profile");
    const p = { purpose: "idioma" as const, language: "Espanhol", languageLevel: "B1" };
    expect(isLanguageSubject(p, "Espanhol")).toBe(true);
    expect(isLanguageSubject(p, "Gramática")).toBe(true);
    expect(isLanguageSubject(p, "Matemática")).toBe(false);
    expect(examStyleFromPersonalization(p, "História")).toContain("em português");
    expect(examStyleFromPersonalization(p, "Espanhol")).toContain("Espanhol");
  });
});

describe("roteiro do bloco de estudo", () => {
  it("divide o tempo planejado em etapas que somam o bloco", async () => {
    const { buildRoadmap } = await import("@/lib/study-roadmap");
    for (const type of ["estudo", "revisao", "simulado", "redacao"]) {
      const steps = buildRoadmap({ type, subject: "Biologia", topic: "Genética", plannedMinutes: 60, practiceHref: "/dashboard/quizzes/x" });
      expect(steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(60);
    }
    const study = buildRoadmap({ type: "estudo", subject: "Biologia", topic: "Genética", plannedMinutes: 60 });
    expect(study.find((step) => step.external)?.href).toContain("youtube.com/results");
  });
});
