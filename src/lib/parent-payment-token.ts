import { createHash, randomBytes } from "node:crypto";

export function createParentToken() { return randomBytes(32).toString("base64url"); }
export function hashParentToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function validParentToken(token: string) { return /^[A-Za-z0-9_-]{43}$/.test(token); }
export function parentLinkExpired(expiresAt: Date, now = new Date()) { return expiresAt <= now; }
