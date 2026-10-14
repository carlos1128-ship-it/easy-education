import { describe, expect, it } from "vitest";
import { createParentToken, hashParentToken, parentLinkExpired, validParentToken } from "./parent-payment-token";
describe("links para os pais", () => {
  it("gera códigos aleatórios, sem identificadores do aluno", () => {
    const a = createParentToken(), b = createParentToken();
    expect(validParentToken(a)).toBe(true); expect(a).not.toBe(b);
    expect(hashParentToken(a)).toHaveLength(64); expect(hashParentToken(a)).not.toBe(a);
  });
  it("recusa entradas que não são códigos", () => {
    for (const token of ["", "student@email.com", "../token", "a".repeat(42), "a".repeat(44)]) expect(validParentToken(token)).toBe(false);
  });
  it("expira no instante exato", () => {
    const now = new Date("2026-10-14T15:00:00Z");
    expect(parentLinkExpired(now, now)).toBe(true);
    expect(parentLinkExpired(new Date(now.getTime() + 1), now)).toBe(false);
  });
});
