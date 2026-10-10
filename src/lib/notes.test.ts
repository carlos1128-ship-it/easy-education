import { describe, expect, it } from "vitest";
import { NOTE_MAX_CHARS, noteContextLabel, noteCreateSchema, noteFilterFromParams } from "@/lib/notes";

describe("anotações", () => {
  it("aceita anotação solta e recusa vazia ou longa demais", () => {
    expect(noteCreateSchema.safeParse({ content: "Lembrar da fórmula de Bhaskara" }).success).toBe(true);
    expect(noteCreateSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(noteCreateSchema.safeParse({ content: "a".repeat(NOTE_MAX_CHARS + 1) }).success).toBe(false);
  });
  it("liga a um bloco do plano com dia no formato certo", () => {
    expect(noteCreateSchema.safeParse({ content: "ok", blockDay: "2026-10-10", blockKey: "fisica|mru|estudo" }).success).toBe(true);
    expect(noteCreateSchema.safeParse({ content: "ok", blockDay: "10/10/2026" }).success).toBe(false);
  });
  it("filtro da URL só usa campos de ligação", () => {
    expect(noteFilterFromParams(new URLSearchParams("subject=Física&userId=outro&content=x"))).toEqual({ subject: "Física" });
  });
  it("rótulo do contexto", () => {
    expect(noteContextLabel({ blockKey: "k", subject: "Física", topic: "MRU" })).toBe("Bloco do plano · Física · MRU");
    expect(noteContextLabel({})).toBe("Anotação livre");
  });
});
