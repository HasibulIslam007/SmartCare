import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { EncryptionService } from "./encryption.service";
import { hashToken } from "./token-hash";
import { TotpService } from "./totp.service";

export const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totp: TotpService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Stores a pending secret without enabling MFA. The account only becomes
   * MFA-protected once a code from the authenticator proves the secret works,
   * so a half-finished enrolment can never lock someone out.
   */
  async beginEnrollment(userId: string, account: string) {
    const secret = this.totp.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.encryption.seal(secret), mfaEnabledAt: null },
    });
    return { secret, keyUri: this.totp.keyUri(secret, account) };
  }

  async activate(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret)
      throw new BadRequestException("Start authenticator setup first");
    if (user.mfaEnabledAt)
      throw new BadRequestException("Two-factor authentication is already on");
    if (!this.totp.verify(this.encryption.open(user.mfaSecret), code))
      throw new UnauthorizedException("That authenticator code is not valid");
    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(5).toString("hex"),
    );
    await this.prisma.$transaction([
      this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.mfaRecoveryCode.createMany({
        data: recoveryCodes.map((value) => ({
          userId,
          codeHash: hashToken(value),
        })),
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabledAt: new Date() },
      }),
    ]);
    // Returned once only; the database keeps digests.
    return { recoveryCodes };
  }

  /** True for a valid authenticator code or an unused recovery code. */
  async verifyFactor(userId: string, code: string) {
    if (/^\d{6}$/.test(code) && (await this.verifyAuthenticator(userId, code)))
      return true;
    return this.consumeRecoveryCode(userId, code);
  }

  private async verifyAuthenticator(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });
    if (!user?.mfaSecret) return false;
    return this.totp.verify(this.encryption.open(user.mfaSecret), code);
  }

  private async consumeRecoveryCode(userId: string, code: string) {
    const claimed = await this.prisma.mfaRecoveryCode.updateMany({
      where: { userId, codeHash: hashToken(code), usedAt: null },
      data: { usedAt: new Date() },
    });
    return claimed.count === 1;
  }

  /**
   * Requires either an authenticator code or a recovery code, so a stolen
   * session alone cannot strip two-factor protection from the account.
   */
  async disable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaEnabledAt)
      throw new BadRequestException("Two-factor authentication is not enabled");
    if (!(await this.verifyFactor(userId, code)))
      throw new UnauthorizedException("That code is not valid");
    await this.prisma.$transaction([
      this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: null, mfaEnabledAt: null },
      }),
    ]);
    return { enabled: false };
  }

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabledAt: true },
    });
    const recoveryCodesRemaining = await this.prisma.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    return {
      enabled: Boolean(user?.mfaEnabledAt),
      pendingSetup: Boolean(user?.mfaSecret) && !user?.mfaEnabledAt,
      recoveryCodesRemaining,
    };
  }
}
