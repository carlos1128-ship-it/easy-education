import { describe, expect, it } from "vitest";
import { levelFor, levelTitle, xpFor, xpForLevel } from "@/lib/xp";

describe("XP e níveis", () => {
  it("conta cada atividade com o seu peso", () => {
    expect(xpFor({ correct: 7, wrong: 3 })).toBe(76);
    expect(xpFor({ blocks: 1, daySummaries: 1, essays: 1, cards: 10, minutes: 20 })).toBe(50 + 30 + 40 + 30 + 20);
    expect(xpFor({})).toBe(0);
  });

  it("cada nível pede 100 XP a mais que o anterior", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
  });

  it("nível, progresso e quanto falta", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, levelStart: 0, nextLevel: 100, toNext: 100, progress: 0 });
    expect(levelFor(150)).toMatchObject({ level: 2, levelStart: 100, nextLevel: 300, toNext: 150, progress: 0.25 });
    expect(levelFor(300).level).toBe(3);
    expect(levelFor(-5).level).toBe(1);
  });

  it("títulos por faixa", () => {
    expect(levelTitle(1)).toBe("Calouro");
    expect(levelTitle(4)).toBe("Estudante");
    expect(levelTitle(40)).toBe("Lenda");
  });
});
