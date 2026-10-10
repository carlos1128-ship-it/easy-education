import { describe, expect, it } from "vitest";
import { describeAccuracy, MIN_SAMPLE, qualityGate, wilsonInterval } from "@/lib/ai-quality";

describe("confiabilidade das questões geradas", () => {
  it("intervalo de Wilson contém a taxa e fica dentro de 0 a 1", () => {
    const { low, high, rate } = wilsonInterval(27, 30);
    expect(rate).toBeCloseTo(0.9, 5);
    expect(low).toBeGreaterThan(0.73);
    expect(low).toBeLessThan(0.9);
    expect(high).toBeGreaterThan(0.9);
    expect(wilsonInterval(30, 30).high).toBe(1);
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0, rate: 0 });
  });

  it("amostra pequena não decide nada", () => {
    expect(qualityGate(null)).toBe("sem_medicao");
    expect(qualityGate({ sample: MIN_SAMPLE - 1, correct: 0 })).toBe("sem_medicao");
  });

  it("abaixo de 90% vai para o plano B; 90% ou mais fica liberado", () => {
    expect(qualityGate({ sample: 30, correct: 26 })).toBe("plano_b");
    expect(qualityGate({ sample: 30, correct: 27 })).toBe("liberado");
  });

  it("texto do relatório", () => {
    expect(describeAccuracy(27, 30)).toMatch(/^90,0% \(n = 30; IC 95%: \d+,\d% a \d+,\d%\)$/);
  });
});
