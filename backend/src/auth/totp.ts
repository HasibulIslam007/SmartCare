import { createHmac, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 without padding, the encoding authenticator apps expect. */
export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of cleaned) {
    const index = ALPHABET.indexOf(character);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(key: Buffer, counter: number, digits: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function generateTotp(
  secret: Buffer,
  at: number,
  digits = 6,
  period = 30,
): string {
  return hotp(secret, Math.floor(at / 1000 / period), digits);
}

/** Constant-time comparison that tolerates length mismatch. */
export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Accepts the current step plus `window` steps either side, to tolerate clock
 * drift between the server and the authenticator app.
 */
export function verifyTotp(
  secret: Buffer,
  token: string,
  at: number,
  digits = 6,
  period = 30,
  window = 1,
): boolean {
  if (!/^\d+$/.test(token) || token.length !== digits) return false;
  for (let offset = -window; offset <= window; offset++) {
    if (constantTimeEquals(generateTotp(secret, at + offset * period * 1000, digits, period), token))
      return true;
  }
  return false;
}
