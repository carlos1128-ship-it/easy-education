import { describe, expect, it } from "vitest";
import { isExactScience } from "@/lib/checked-questions";

describe("matérias de contas usam a conferência mais forte", () => {
  it("reconhece exatas com e sem acento", () => {
    expect(isExactScience("Matemática")).toBe(true);
    expect(isExactScience("Quimica", "Estequiometria")).toBe(true);
    expect(isExactScience("Física")).toBe(true);
    expect(isExactScience("Multidisciplinar", "Biologia, Matematica")).toBe(true);
    expect(isExactScience("História", "Era Vargas")).toBe(false);
  });
});
