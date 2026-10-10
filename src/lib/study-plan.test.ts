import { describe, expect, it } from "vitest";
import { daysFromToday, getTodayPlanBlocks, orderWeekFromToday, relativeDayLabel, todayWeekday } from "@/lib/study-plan";

const WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((dayOfWeek) => ({ dayOfWeek, blocks: [] }));

describe("semana a partir de hoje (horário de Brasília)", () => {
  // Sexta, 09/10/2026, 15:00 em Brasília (18:00 UTC).
  const friday = new Date("2026-10-09T18:00:00Z");

  it("começa no dia de hoje e segue a ordem até a véspera", () => {
    expect(orderWeekFromToday(WEEK, friday).map((day) => day.dayOfWeek)).toEqual([
      "friday", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday",
    ]);
  });

  it("vira o dia à meia-noite de Brasília, não à meia-noite UTC", () => {
    // 23:59 de sexta em Brasília = 02:59 UTC de sábado.
    const lastMinute = new Date("2026-10-10T02:59:00Z");
    // 00:00 de sábado em Brasília = 03:00 UTC.
    const midnight = new Date("2026-10-10T03:00:00Z");
    expect(todayWeekday(lastMinute)).toBe("friday");
    expect(orderWeekFromToday(WEEK, lastMinute)[0].dayOfWeek).toBe("friday");
    expect(todayWeekday(midnight)).toBe("saturday");
    expect(orderWeekFromToday(WEEK, midnight).map((day) => day.dayOfWeek)).toEqual([
      "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday",
    ]);
  });

  it("aceita plano com dias faltando e nome em maiúsculas", () => {
    const partial = [{ dayOfWeek: "Monday" }, { dayOfWeek: "Saturday" }, { dayOfWeek: "Thursday" }];
    expect(orderWeekFromToday(partial, friday).map((day) => day.dayOfWeek)).toEqual(["Saturday", "Monday", "Thursday"]);
  });

  it("dia desconhecido vai para o fim", () => {
    const odd = [{ dayOfWeek: "feriado" }, { dayOfWeek: "friday" }];
    expect(orderWeekFromToday(odd, friday).map((day) => day.dayOfWeek)).toEqual(["friday", "feriado"]);
  });

  it("rótulos relativos e distância em dias", () => {
    expect(relativeDayLabel("friday", friday)).toBe("Hoje");
    expect(relativeDayLabel("saturday", friday)).toBe("Amanhã");
    expect(relativeDayLabel("monday", friday)).toBe("Seg");
    expect(daysFromToday("thursday", friday)).toBe(6);
  });

  it("blocos de hoje seguem o mesmo fuso", () => {
    const plan = { days: [{ dayOfWeek: "friday", blocks: [{ subject: "Física", topic: "", durationMinutes: 30, method: "", type: "estudo" as const }] }], weeklyGoals: [], tips: [] };
    expect(getTodayPlanBlocks(plan, new Date("2026-10-10T02:59:00Z"))).toHaveLength(1);
    expect(getTodayPlanBlocks(plan, new Date("2026-10-10T03:00:00Z"))).toHaveLength(0);
  });
});
