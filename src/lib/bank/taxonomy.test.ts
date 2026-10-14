import { describe, expect, it } from "vitest";
import { SEED_SUBJECTS } from "@/lib/bank/constants";
import { TAXONOMY, slugify, topicsOf } from "@/lib/bank/taxonomy";

describe("árvore de conteúdo", () => {
  it("cada matéria existe no banco e aparece uma vez", () => {
    const known = new Set(SEED_SUBJECTS.map((subject) => subject.slug));
    const slugs = TAXONOMY.map((subject) => subject.slug);
    expect(slugs.filter((slug) => !known.has(slug))).toEqual([]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("unidades e tópicos têm slug único dentro da matéria (índice único no banco)", () => {
    for (const subject of TAXONOMY) {
      const units = subject.units.map((unit) => slugify(unit.name));
      const topics = topicsOf(subject.slug).map((item) => item.topicSlug);
      expect(new Set(units).size, subject.slug).toBe(units.length);
      expect(new Set(topics).size, subject.slug).toBe(topics.length);
      expect(topics.every(Boolean)).toBe(true);
    }
  });

  it("slug sem acento e com hífens", () => {
    expect(slugify("Água e sais minerais")).toBe("agua-e-sais-minerais");
    expect(slugify("Sequências e progressões (PA e PG)")).toBe("sequencias-e-progressoes-pa-e-pg");
  });
});
