import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/ai-cost";
import {
  FEATURE_KEYS,
  PLANS,
  PLAN_ORDER,
  allowanceFor,
  describeAllowance,
  formatPriceBRL,
  nextTier,
  upgradeTargetFor,
  uploadLimitMB,
} from "@/lib/plans";
import { describeReset, startOfDaySP, startOfMonthSP, startOfNextMonthSP, startOfWeekSP, windowReset } from "@/lib/time-window";
import { evaluateAllowance } from "@/lib/plan-limits";

describe("planos e limites (valores combinados com o produto)", () => {
  it("preços mensais", () => {
    expect(formatPriceBRL(PLANS.basic.priceCents)).toBe("R$ 19,90");
    expect(formatPriceBRL(PLANS.full.priceCents)).toBe("R$ 34,90");
    expect(PLANS.free.priceCents).toBe(0);
  });

  it("chat: 3, 12 e 30 mensagens por dia", () => {
    expect(allowanceFor("free", "chat_message")).toEqual({ kind: "limit", max: 3, window: "day" });
    expect(allowanceFor("basic", "chat_message")).toEqual({ kind: "limit", max: 12, window: "day" });
    expect(allowanceFor("full", "chat_message")).toEqual({ kind: "limit", max: 30, window: "day" });
  });

  it("redação: 1 por semana, 3 por semana e 1 por dia", () => {
    expect(allowanceFor("free", "essay_correction")).toEqual({ kind: "limit", max: 1, window: "week" });
    expect(allowanceFor("basic", "essay_correction")).toEqual({ kind: "limit", max: 3, window: "week" });
    expect(allowanceFor("full", "essay_correction")).toEqual({ kind: "limit", max: 1, window: "day" });
  });

  it("redação por foto fica bloqueada no Gratuito", () => {
    expect(allowanceFor("free", "essay_photo_read").kind).toBe("locked");
    expect(allowanceFor("basic", "essay_photo_read").kind).toBe("limit");
  });

  it("upload: quantidade por dia e tamanho por plano", () => {
    expect(allowanceFor("free", "file_upload")).toEqual({ kind: "limit", max: 1, window: "day" });
    expect(allowanceFor("basic", "file_upload")).toEqual({ kind: "limit", max: 2, window: "day" });
    expect(allowanceFor("full", "file_upload")).toEqual({ kind: "limit", max: 5, window: "day" });
    expect([uploadLimitMB("free"), uploadLimitMB("basic"), uploadLimitMB("full")]).toEqual([5, 15, 50]);
  });

  it("trilha bloqueada no Gratuito e aberta nos pagos", () => {
    expect(allowanceFor("free", "trail").kind).toBe("locked");
    expect(allowanceFor("basic", "trail").kind).toBe("open");
    expect(allowanceFor("full", "trail").kind).toBe("open");
  });

  it("geração por IA (quiz, flashcards, simulado) é bloqueada no Gratuito", () => {
    for (const feature of ["ai_quiz", "ai_flashcards", "ai_simulado"] as const) {
      expect(allowanceFor("free", feature).kind).toBe("locked");
      expect(allowanceFor("basic", feature).kind).toBe("limit");
      expect(allowanceFor("full", feature).kind).toBe("limit");
    }
  });

  it("o Completo nunca tem limite menor que o Básico (em usos por dia)", () => {
    const perDay = (tier: "basic" | "full", feature: (typeof FEATURE_KEYS)[number]) => {
      const a = allowanceFor(tier, feature);
      return a.kind === "limit" ? (a.window === "week" ? a.max / 7 : a.max) : Number.POSITIVE_INFINITY;
    };
    for (const feature of FEATURE_KEYS) expect(perDay("full", feature)).toBeGreaterThanOrEqual(perDay("basic", feature));
  });

  it("todo recurso tem texto para a interface e nenhum plano promete 'ilimitado'", () => {
    for (const tier of PLAN_ORDER) {
      for (const feature of FEATURE_KEYS) {
        const text = describeAllowance(feature, allowanceFor(tier, feature));
        if (text) expect(text.toLowerCase()).not.toContain("ilimitad");
      }
    }
  });

  it("os tetos de segurança crescem com o plano", () => {
    expect(PLANS.free.safety.dailyUnits).toBeLessThan(PLANS.basic.safety.dailyUnits);
    expect(PLANS.basic.safety.dailyUnits).toBeLessThan(PLANS.full.safety.dailyUnits);
    expect(PLANS.free.safety.dailyCostUsd).toBeLessThan(PLANS.full.safety.dailyCostUsd);
  });

  it("o teto mensal de uso justo cresce com o plano e não passa do preço", () => {
    expect(PLANS.free.safety.monthlyCostUsd).toBeLessThan(PLANS.basic.safety.monthlyCostUsd);
    expect(PLANS.basic.safety.monthlyCostUsd).toBeLessThan(PLANS.full.safety.monthlyCostUsd);
    // Em reais (câmbio 5,50), o gasto máximo de IA por aluno fica dentro do preço do plano.
    expect(PLANS.basic.safety.monthlyCostUsd * 5.5).toBeLessThanOrEqual(PLANS.basic.priceCents / 100);
    expect(PLANS.full.safety.monthlyCostUsd * 5.5).toBeLessThanOrEqual(PLANS.full.priceCents / 100);
  });

  it("teto de custo combinado: Gratuito até R$ 1, Básico até R$ 4,90 e Completo até R$ 14,90 por mês", () => {
    expect(PLANS.free.safety.monthlyCostUsd * 5.5).toBeLessThanOrEqual(1);
    expect(PLANS.basic.safety.monthlyCostUsd * 5.5).toBeLessThanOrEqual(4.9);
    expect(PLANS.full.safety.monthlyCostUsd * 5.5).toBeLessThanOrEqual(14.9);
  });

  it("vídeo: bloqueado no Gratuito, trechos de até 20 min no Básico e 30 min no Completo", () => {
    expect(PLANS.free.videoMaxMinutes).toBe(0);
    expect(PLANS.basic.videoMaxMinutes).toBe(20);
    expect(PLANS.full.videoMaxMinutes).toBe(30);
  });

  it("upgrade: Gratuito → Básico, Básico → Completo, Completo sem upgrade", () => {
    expect(nextTier("free")).toBe("basic");
    expect(nextTier("basic")).toBe("full");
    expect(nextTier("full")).toBeNull();
    expect(upgradeTargetFor("free", "chat_message")).toBe("basic");
    expect(upgradeTargetFor("basic", "chat_message")).toBe("full");
    expect(upgradeTargetFor("full", "chat_message")).toBeNull();
    expect(upgradeTargetFor("free", "trail")).toBe("basic");
  });
});

describe("janelas de limite no horário de Brasília", () => {
  it("o dia começa à meia-noite de Brasília (03:00 UTC)", () => {
    // 10/10/2026 01:00 UTC ainda é 09/10 22:00 em Brasília.
    expect(startOfDaySP(new Date("2026-10-10T01:00:00Z")).toISOString()).toBe("2026-10-09T03:00:00.000Z");
    expect(startOfDaySP(new Date("2026-10-10T03:00:00Z")).toISOString()).toBe("2026-10-10T03:00:00.000Z");
    expect(startOfDaySP(new Date("2026-10-10T02:59:59Z")).toISOString()).toBe("2026-10-09T03:00:00.000Z");
  });

  it("a semana começa na segunda-feira de Brasília", () => {
    // 09/10/2026 é sexta-feira: a semana começou na segunda 05/10.
    expect(startOfWeekSP(new Date("2026-10-09T15:00:00Z")).toISOString()).toBe("2026-10-05T03:00:00.000Z");
    // Segunda 05/10 às 02:00 UTC ainda é domingo em Brasília: pertence à semana anterior (começou em 28/09).
    expect(startOfWeekSP(new Date("2026-10-05T02:00:00Z")).toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(startOfWeekSP(new Date("2026-10-05T03:00:00Z")).toISOString()).toBe("2026-10-05T03:00:00.000Z");
    // Domingo fica na semana que começou na segunda anterior.
    expect(startOfWeekSP(new Date("2026-10-11T12:00:00Z")).toISOString()).toBe("2026-10-05T03:00:00.000Z");
  });

  it("o limite volta no começo da próxima janela", () => {
    const now = new Date("2026-10-09T15:00:00Z");
    expect(windowReset("day", now).toISOString()).toBe("2026-10-10T03:00:00.000Z");
    expect(windowReset("week", now).toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });

  it("o mês começa no dia 1º à meia-noite de Brasília", () => {
    expect(startOfMonthSP(new Date("2026-10-09T15:00:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(startOfMonthSP(new Date("2026-11-01T02:00:00Z")).toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(startOfNextMonthSP(new Date("2026-10-09T15:00:00Z")).toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(startOfNextMonthSP(new Date("2026-12-20T15:00:00Z")).toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("descreve quando o limite volta", () => {
    const now = new Date("2026-10-09T15:00:00Z");
    expect(describeReset("day", now)).toBe("amanhã às 00:00");
    expect(describeReset("week", now)).toBe("segunda-feira às 00:00");
  });
});

describe("conta de limite", () => {
  const now = new Date("2026-10-09T15:00:00Z");

  it("sobra uso enquanto não chegou no máximo", () => {
    const status = evaluateAllowance({ kind: "limit", max: 3, window: "day" }, 2, now);
    expect(status).toMatchObject({ state: "limit", remaining: 1, used: 2 });
  });

  it("zera o restante ao chegar no máximo e nunca fica negativo", () => {
    expect(evaluateAllowance({ kind: "limit", max: 3, window: "day" }, 3, now)).toMatchObject({ remaining: 0 });
    expect(evaluateAllowance({ kind: "limit", max: 3, window: "day" }, 9, now)).toMatchObject({ remaining: 0 });
  });

  it("recurso fechado ou liberado não tem contagem", () => {
    expect(evaluateAllowance({ kind: "locked" }, 0, now)).toEqual({ state: "locked" });
    expect(evaluateAllowance({ kind: "open" }, 0, now)).toEqual({ state: "open" });
  });
});

describe("custo estimado de IA", () => {
  it("usa o preço do modelo com a margem de segurança", () => {
    // 1 milhão de tokens de entrada + 1 milhão de saída no flash: (0,30 + 2,50) * 1,15.
    expect(estimateCostUsd("gemini-2.5-flash", 1_000_000, 1_000_000)).toBeCloseTo(3.22, 5);
    expect(estimateCostUsd("gemini-2.5-flash-lite", 1_000_000, 1_000_000)).toBeCloseTo(0.575, 5);
  });

  it("modelo desconhecido não é subestimado", () => {
    expect(estimateCostUsd("modelo-novo", 1_000_000, 0)).toBeCloseTo(0.345, 5);
  });
});
