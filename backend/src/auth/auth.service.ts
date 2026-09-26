import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthTokenPurpose, Role } from "../generated/prisma/enums";
import { MailService } from "../mail/mail.service";
import { PublicUser, UsersService } from "../users/users.service";
import {
  AuthTokenService,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from "./auth-token.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";

// A challenge token must never be usable as an access token, so it is signed
// for a different audience than the API's own tokens.
const MFA_CHALLENGE_AUDIENCE = "smartcare-mfa";
const MFA_CHALLENGE_TTL_SECONDS = 300;

type AuthRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly tokens: AuthTokenService,
    private readonly mfa: MfaService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.users.createPatient({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: await this.passwords.hash(dto.password),
    });
    // Verification is tracked but does not gate sign-in, so a mail outage can
    // never block registration.
    await this.sendVerification(user.id, user.email);
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const record = await this.users.findByEmail(dto.email);
    const valid = await this.passwords.verify(
      record?.passwordHash,
      dto.password,
    );
    if (!record || !valid)
      throw new UnauthorizedException("Invalid email or password");
    if (record.mfaEnabledAt)
      return {
        mfaRequired: true as const,
        challengeToken: await this.jwt.signAsync(
          { sub: record.id, typ: "mfa" },
          {
            expiresIn: MFA_CHALLENGE_TTL_SECONDS,
            audience: MFA_CHALLENGE_AUDIENCE,
          },
        ),
      };
    return this.session(this.toPublicUser(record));
  }

  /** Exchanges the short-lived login challenge plus a second factor for a session. */
  async completeMfaChallenge(challengeToken: string, code: string) {
    const expired = new UnauthorizedException(
      "This sign-in attempt expired. Please sign in again.",
    );
    let payload: { sub?: unknown; typ?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; typ?: unknown }>(
        challengeToken,
        { audience: MFA_CHALLENGE_AUDIENCE },
      );
    } catch {
      throw expired;
    }
    if (payload.typ !== "mfa" || typeof payload.sub !== "string") throw expired;
    if (!(await this.mfa.verifyFactor(payload.sub, code)))
      throw new UnauthorizedException(
        "That authenticator or recovery code is not valid",
      );
    const record = await this.users.findAuthById(payload.sub);
    // Still enrolled? A disabled factor must not complete a stale challenge.
    if (!record?.mfaEnabledAt) throw expired;
    return this.session(this.toPublicUser(record));
  }

  async requestPasswordReset(email: string) {
    const record = await this.users.findByEmail(email);
    if (record) {
      await this.tokens.discardOutstanding(
        record.id,
        AuthTokenPurpose.PASSWORD_RESET,
      );
      const token = await this.tokens.issue(
        record.id,
        AuthTokenPurpose.PASSWORD_RESET,
        PASSWORD_RESET_TTL_MS,
      );
      await this.mail.sendPasswordReset(record.email, token);
    }
    // Identical response either way: never reveal whether an account exists.
    return { accepted: true };
  }

  async resetPassword(token: string, password: string) {
    const claimed = await this.tokens.consume(
      token,
      AuthTokenPurpose.PASSWORD_RESET,
    );
    if (!claimed)
      throw new BadRequestException(
        "This password reset link is invalid or has expired",
      );
    await this.users.updatePassword(
      claimed.userId,
      await this.passwords.hash(password),
    );
    await this.tokens.discardOutstanding(
      claimed.userId,
      AuthTokenPurpose.PASSWORD_RESET,
    );
    return { reset: true };
  }

  async verifyEmail(token: string) {
    const claimed = await this.tokens.consume(
      token,
      AuthTokenPurpose.EMAIL_VERIFICATION,
    );
    if (!claimed)
      throw new BadRequestException(
        "This verification link is invalid or has expired",
      );
    await this.users.markEmailVerified(claimed.userId);
    return { verified: true };
  }

  async resendVerification(user: PublicUser) {
    if (user.emailVerifiedAt)
      throw new BadRequestException("This address is already confirmed");
    await this.sendVerification(user.id, user.email);
    return { sent: true };
  }

  private async sendVerification(userId: string, email: string) {
    await this.tokens.discardOutstanding(
      userId,
      AuthTokenPurpose.EMAIL_VERIFICATION,
    );
    const token = await this.tokens.issue(
      userId,
      AuthTokenPurpose.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL_MS,
    );
    await this.mail.sendEmailVerification(email, token);
  }

  private toPublicUser(record: AuthRecord): PublicUser {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      role: record.role,
      emailVerifiedAt: record.emailVerifiedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private async session(user: PublicUser) {
    return {
      user,
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: "Bearer",
      expiresIn: 900,
    };
  }
}
