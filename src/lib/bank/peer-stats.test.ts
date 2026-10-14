import { describe, expect, it } from "vitest";
import { percentileOf, rankWeakTopics } from "@/lib/bank/peer-stats";

describe("comparação com a turma", () => {
  it("conta quem ficou abaixo e metade dos empates", () => {
    expect(percentileOf(80, [40, 50, 60, 70])).toBe(100);
    expect(percentileOf(10, [40, 50, 60, 70])).toBe(0);
    expect(percentileOf(50, [40, 50, 60, 70])).toBe(38);
    expect(percentileOf(50, [])).toBe(0);
  });
});

describe("assuntos a reforçar", () => {
  const base = { subject: "Matemática", subjectSlug: "matematica", examSlug: "enem" };

  it("pega os de menor acerto, com amostra mínima, até o limite", () => {
    const ranked = rankWeakTopics(
      [
        { ...base, topicId: "a", topic: "Funções", answered: 10, correct: 3 },
        { ...base, topicId: "b", topic: "Geometria", answered: 2, correct: 0 },
        { ...base, topicId: "c", topic: "Estatística", answered: 5, correct: 4 },
        { ...base, topicId: "d", topic: "Porcentagem", answered: 8, correct: 4 },
        { ...base, topicId: "e", topic: "Razão", answered: 4, correct: 1 },
      ],
      2,
    );
    expect(ranked.map((item) => item.topicId)).toEqual(["e", "a"]);
    expect(ranked[0]).toMatchObject({ accuracy: 25, answered: 4 });
  });

  it("desempata pelo assunto mais praticado", () => {
    const ranked = rankWeakTopics(
      [
        { ...base, topicId: "a", topic: "A", answered: 4, correct: 2 },
        { ...base, topicId: "b", topic: "B", answered: 10, correct: 5 },
      ],
      3,
    );
    expect(ranked.map((item) => item.topicId)).toEqual(["b", "a"]);
  });

  it("aceita matéria sem assunto classificado", () => {
    const ranked = rankWeakTopics([{ ...base, topicId: null, topic: null, answered: 6, correct: 2 }], 3);
    expect(ranked).toEqual([{ ...base, topicId: null, topic: null, answered: 6, accuracy: 33 }]);
  });
});
