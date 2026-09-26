import { createHash } from "node:crypto";

/**
 * One-way digest for bearer secrets (email verification, password reset and
 * MFA recovery codes). These are high-entropy random values, so a plain
 * SHA-256 is sufficient; only the digest is ever persisted.
 */
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
