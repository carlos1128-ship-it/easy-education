import { describe, expect, it } from "vitest";
import { blockCompletion, blockKey, blockStatus, dayKeySP, isDayComplete, segmentMinutes } from "@/lib/study-completion";
import { buildRoadmap, roadmapChecks } from "@/lib/study-roadmap";

const none = { minutes: 0, quiz: 0, simulado: 0, essay: 0, cards: 0 };

describe("bloco concluído", () => {
  it("atividade terminada conclui, mesmo com pouco tempo", () => {
    expect(blockCompletion({ plannedMinutes: 60, studiedMinutes: 5, activityDone: true })).toBe("atividade");
  });
  it("minutos planejados cumpridos concluem sem a atividade", () => {
    expect(blockCompletion({ plannedMinutes: 60, studiedMinutes: 60, activityDone: false })).toBe("tempo");
    expect(blockCompletion({ plannedMinutes: 60, studiedMinutes: 59, activityDone: false })).toBeNull();
  });
  it("estado do bloco: sem registro é pendente", () => {
    expect(blockStatus(null)).toBe("pendente");
    expect(blockStatus({ status: "em_andamento" })).toBe("em_andamento");
    expect(blockStatus({ status: "concluido" })).toBe("concluido");
  });
  it("chave do bloco ignora acento e maiúsculas", () => {
    expect(blockKey({ subject: "Matemática", topic: "Funções", type: "estudo" })).toBe(blockKey({ subject: "matematica", topic: "funcoes", type: "estudo" }));
    expect(blockKey({ subject: "Matemática", topic: "Funções", type: "estudo" })).not.toBe(blockKey({ subject: "Matemática", topic: "Funções", type: "revisao" }));
  });
  it("dia e minutos no horário de Brasília", () => {
    expect(dayKeySP(new Date("2026-10-10T02:59:00Z"))).toBe("2026-10-09");
    expect(dayKeySP(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-10");
    expect(segmentMinutes(new Date("2026-10-10T10:00:00Z"), new Date("2026-10-10T10:25:20Z"))).toBe(25);
    expect(segmentMinutes(null)).toBe(0);
  });
});

describe("dia concluído (trilha)", () => {
  it("minutos do dia cumpridos concluem", () => {
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, minutes: 60 }, blocks: [{ type: "estudo" }, { type: "redacao" }] })).toBe(true);
  });
  it("todos os blocos precisam estar concluídos", () => {
    const blocks = [{ type: "estudo" }, { type: "redacao" }];
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, quiz: 1 }, blocks })).toBe(false);
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, quiz: 1, essay: 1 }, blocks })).toBe(true);
    expect(isDayComplete({ targetMinutes: 60, activity: none, blocks: [{ type: "estudo", done: true }, { type: "redacao", done: true }] })).toBe(true);
  });
  it("cada atividade cobre um bloco só", () => {
    const blocks = [{ type: "estudo" }, { type: "estudo" }];
    expect(isDayComplete({ targetMinutes: 90, activity: { ...none, quiz: 1 }, blocks })).toBe(false);
    expect(isDayComplete({ targetMinutes: 90, activity: { ...none, quiz: 2 }, blocks })).toBe(true);
  });
  it("revisão sem o Iniciar pede 10 cartões", () => {
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, cards: 9 }, blocks: [{ type: "revisao" }] })).toBe(false);
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, cards: 10 }, blocks: [{ type: "revisao" }] })).toBe(true);
  });
  it("dia sem bloco no plano: um quiz basta", () => {
    expect(isDayComplete({ targetMinutes: 60, activity: { ...none, quiz: 1 }, blocks: [] })).toBe(true);
    expect(isDayComplete({ targetMinutes: 60, activity: none, blocks: [] })).toBe(false);
  });
});

describe("roteiro com checks automáticos", () => {
  // estudo de 60 min: 6 (revisão) + 24 (aula) + 21 (prática) + 9 (fechar) = 60
  const steps = buildRoadmap({ type: "estudo", subject: "Física", topic: "MRU", plannedMinutes: 60 });
  const base = { minutes: 0, activityDone: false, reviewsDone: 0, reviewsDue: 3, noteWritten: false };

  it("as etapas somam o tempo do bloco e cada uma tem um evento", () => {
    expect(steps.reduce((sum, step) => sum + step.minutes, 0)).toBe(60);
    expect(steps.map((step) => step.check)).toEqual(["review", "time", "activity", "note"]);
  });
  it("nada feito no começo, com revisão pendente", () => {
    expect(roadmapChecks(steps, base)).toEqual([false, false, false, false]);
  });
  it("aquecimento: feito ao revisar, ou quando não há nada vencido", () => {
    expect(roadmapChecks(steps, { ...base, reviewsDone: 2 })[0]).toBe(true);
    expect(roadmapChecks(steps, { ...base, reviewsDue: 0 })[0]).toBe(true);
  });
  it("etapa de tempo: só quando os minutos chegam ao fim dela", () => {
    const end = steps[0].minutes + steps[1].minutes;
    expect(roadmapChecks(steps, { ...base, minutes: end - 1 })[1]).toBe(false);
    expect(roadmapChecks(steps, { ...base, minutes: end })[1]).toBe(true);
  });
  it("prática: só com a atividade terminada, não com o tempo", () => {
    expect(roadmapChecks(steps, { ...base, minutes: 600 })[2]).toBe(false);
    expect(roadmapChecks(steps, { ...base, activityDone: true })[2]).toBe(true);
  });
  it("fechar explicando: anotação no bloco, ou tempo cumprido depois da atividade", () => {
    expect(roadmapChecks(steps, { ...base, noteWritten: true })[3]).toBe(true);
    expect(roadmapChecks(steps, { ...base, minutes: 60 })[3]).toBe(false);
    expect(roadmapChecks(steps, { ...base, minutes: 60, activityDone: true })[3]).toBe(true);
  });
  it("bloco concluído marca tudo", () => {
    expect(roadmapChecks(steps, { ...base, completed: true })).toEqual([true, true, true, true]);
  });
});

import { calculateStreak, startOfToday } from "@/lib/study-stats";

describe("ofensiva no horário de Brasília", () => {
  const now = new Date("2026-10-10T01:30:00Z"); // sexta, 22:30 em Brasília
  it("hoje começa à meia-noite de Brasília", () => {
    expect(startOfToday(now).toISOString()).toBe("2026-10-09T03:00:00.000Z");
  });
  it("conta dias seguidos de Brasília", () => {
    const studied = [new Date("2026-10-10T01:00:00Z"), new Date("2026-10-08T22:00:00Z"), new Date("2026-10-07T15:00:00Z")];
    // sexta (22:00), quinta (19:00) e quarta (12:00) em Brasília
    expect(calculateStreak(studied, now)).toBe(3);
    expect(calculateStreak([new Date("2026-10-08T22:00:00Z")], now)).toBe(0);
  });
});
