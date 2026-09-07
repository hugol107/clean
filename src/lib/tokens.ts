import { randomBytes, randomUUID } from "crypto";

/**
 * Generates a long, cryptographically random, URL-safe token for public NFC
 * tag URLs (`/t/{token}`). 32 bytes of entropy, base64url-encoded (~43
 * chars) — infeasible to guess or enumerate, and carries no information
 * about the location, organization, or database id it points to.
 */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** Short, human-typable backup code (e.g. for a manual "enter code" fallback). */
export function generateShortCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

export function generateId(): string {
  return randomUUID();
}
