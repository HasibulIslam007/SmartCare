import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const CONTEXT = "smartcare-mfa-secret-v1";

/**
 * Seals small secrets (currently the TOTP shared secret) at rest with
 * AES-256-GCM. The key comes from MFA_ENCRYPTION_KEY, falling back to the
 * JWT secret so local development needs no extra setup. Rotating whichever
 * value is in use invalidates enrolled authenticators.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const source =
      config.get<string>("MFA_ENCRYPTION_KEY")?.trim() ||
      config.getOrThrow<string>("JWT_SECRET");
    this.key = scryptSync(source, CONTEXT, 32);
  }

  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const sealed = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      iv.toString("base64url"),
      sealed.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
    ].join(".");
  }

  open(payload: string): string {
    const [iv, sealed, tag] = payload.split(".");
    if (!iv || !sealed || !tag) throw new Error("Malformed encrypted value");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(sealed, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
