import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuthTokenPurpose } from "../generated/prisma/enums";
import { hashToken } from "./token-hash";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the raw token; only its digest is stored. */
  async issue(userId: string, purpose: AuthTokenPurpose, ttlMs: number) {
    const token = randomBytes(32).toString("base64url");
    await this.prisma.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return token;
  }

  /**
   * Atomically claims a token. The conditional update is what makes it
   * single-use: two concurrent submissions cannot both see count === 1.
   */
  async consume(token: string, purpose: AuthTokenPurpose) {
    const tokenHash = hashToken(token);
    const claimed = await this.prisma.authToken.updateMany({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return null;
    const record = await this.prisma.authToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    return record ? { userId: record.userId } : null;
  }

  /** Supersedes earlier links, so only the newest one works. */
  async discardOutstanding(userId: string, purpose: AuthTokenPurpose) {
    await this.prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
