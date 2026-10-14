import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoItems } from "./demo";
import {
  getAttempt,
  publishExam,
  serializeAttempt,
  startAttempt,
  updateAttempt,
} from "./service";
const mock = vi.hoisted(() => ({ db: {} }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => mock.db }));
const snapshot = {
  title: "Teste",
  institutionId: "institution",
  year: 2026,
  phase: "Treino",
  edition: "Autoral",
  booklet: "01",
  day: "",
  language: "",
  questionCount: 6,
  firstNumber: 1,
  durationMinutes: 30,
  allowPause: true,
  items: demoItems("https://example.org/demo.pdf"),
};
function fixture() {
  return {
    id: "attempt",
    userId: "owner",
    examId: "exam",
    keyId: "key",
    status: "active",
    version: 0,
    elapsedSeconds: 0,
    activeSince: new Date(),
    startedAt: new Date(),
    finishedAt: null,
    result: null,
    key: { id: "key", revision: 1, snapshot },
    exam: {
      isDemo: true,
      institution: { name: "Autoral", slug: "easy" },
      documents: [],
    },
    answers: [],
  };
}
let record: ReturnType<typeof fixture>;
let db: ReturnType<typeof database>;
function database() {
  const tx = {
    examAttempt: {
      findFirst: vi.fn(async () => record),
      findUnique: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async ({ data }) => ({ ...record, ...data, version: 1 })),
      upsert: vi.fn(async () => ({ id: "new" })),
    },
    examStudentAnswer: { upsert: vi.fn(), findMany: vi.fn(async () => []) },
    pastExam: {
      findFirst: vi.fn(async () => ({ id: "exam", publishedKeyId: "key" })),
      findUnique: vi.fn(async () => ({
        id: "exam",
        documents: [{ kind: "exam" }, { kind: "key" }],
      })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    examAnswerKey: {
      findFirst: vi.fn(async () => ({ id: "key", status: "draft", snapshot })),
      update: vi.fn(),
    },
  };
  return {
    ...tx,
    $transaction: vi.fn(async (fn: (transaction: typeof tx) => unknown) => fn(tx)),
  };
}
beforeEach(() => {
  record = fixture();
  db = database();
  mock.db = db;
});
describe("tentativas", () => {
  it("filtra a leitura pelo proprietário", async () => {
    await getAttempt("attempt", "owner");
    expect(db.examAttempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "attempt", userId: "owner" } }),
    );
  });
  it("recusa tentativa inexistente/alheia", async () => {
    db.examAttempt.findFirst.mockResolvedValueOnce(null as never);
    await expect(getAttempt("attempt", "other")).rejects.toMatchObject({
      status: 404,
    });
  });
  it("não envia gabarito antes de finalizar", () => {
    const dto = serializeAttempt(record as never);
    expect(dto.result).toBeNull();
    expect(JSON.stringify(dto)).not.toContain("correct");
    expect(JSON.stringify(dto)).not.toContain("explanation");
  });
  it("recusa versão concorrente antes de salvar respostas", async () => {
    db.examAttempt.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      updateAttempt("attempt", "owner", 0, "save", [
        { number: 1, value: "B", reviewed: false },
      ]),
    ).rejects.toMatchObject({ status: 409 });
    expect(db.examStudentAnswer.upsert).not.toHaveBeenCalled();
  });
  it("recusa questão fora do caderno", async () => {
    await expect(
      updateAttempt("attempt", "owner", 0, "save", [
        { number: 999, value: "B", reviewed: false },
      ]),
    ).rejects.toThrow("não pertence");
  });
  it("recusa resposta incompatível", async () => {
    await expect(
      updateAttempt("attempt", "owner", 0, "save", [
        { number: 2, value: "E", reviewed: false },
      ]),
    ).rejects.toThrow("inválida");
  });
  it("salva e permite limpar resposta", async () => {
    await updateAttempt("attempt", "owner", 0, "save", [
      { number: 1, value: "", reviewed: true },
    ]);
    expect(db.examStudentAnswer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { number: 1, value: "", reviewed: true },
      }),
    );
  });
  it("pausa congela cronômetro", async () => {
    const out = await updateAttempt("attempt", "owner", 0, "pause", []);
    expect(out.status).toBe("paused");
    expect(db.examAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activeSince: null }),
      }),
    );
  });
  it("proíbe salvar durante pausa", async () => {
    record.status = "paused";
    await expect(
      updateAttempt("attempt", "owner", 0, "save", [
        { number: 1, value: "A", reviewed: false },
      ]),
    ).rejects.toThrow("Retome");
  });
  it("proíbe pausa desabilitada", async () => {
    record.key.snapshot = { ...snapshot, allowPause: false };
    await expect(
      updateAttempt("attempt", "owner", 0, "pause", []),
    ).rejects.toThrow("indisponível");
  });
  it("expiração não aceita respostas atrasadas e finaliza", async () => {
    record.elapsedSeconds = 1801;
    const out = await updateAttempt("attempt", "owner", 0, "save", [
      { number: 1, value: "B", reviewed: false },
    ]);
    expect(out.status).toBe("finished");
    expect(db.examStudentAnswer.upsert).not.toHaveBeenCalled();
    expect(out.result?.correct).toBe(0);
  });
  it("finalização repetida é idempotente", async () => {
    record.status = "finished";
    await updateAttempt("attempt", "owner", 99, "finish", []);
    expect(db.examAttempt.updateMany).not.toHaveBeenCalled();
  });
  it("reutiliza requestId sem criar outra tentativa", async () => {
    db.examAttempt.findUnique.mockResolvedValueOnce({
      id: "previous",
    } as never);
    expect(await startAttempt("exam", "owner", "request")).toEqual({
      id: "previous",
    });
    expect(db.examAttempt.upsert).not.toHaveBeenCalled();
  });
});
describe("publicação", () => {
  it("exige confirmação humana", async () => {
    await expect(publishExam("exam", "key", 0, "admin", false)).rejects.toThrow(
      "revisão humana",
    );
  });
  it("exige gabarito mais recente", async () => {
    await expect(
      publishExam("exam", "old-key", 0, "admin", true),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("não publica explicação pendente", async () => {
    db.examAnswerKey.findFirst.mockResolvedValueOnce({
      id: "key",
      status: "draft",
      snapshot: {
        ...snapshot,
        items: [{ ...snapshot.items[0], explanationReviewed: false }],
      },
    });
    await expect(publishExam("exam", "key", 0, "admin", true)).rejects.toThrow(
      "revisão",
    );
    expect(db.examAnswerKey.update).not.toHaveBeenCalled();
  });
  it("registra responsável e data de revisão", async () => {
    await publishExam("exam", "key", 0, "admin", true);
    expect(db.examAnswerKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewedBy: "admin",
          status: "reviewed",
          reviewedAt: expect.any(Date),
        }),
      }),
    );
  });
});
