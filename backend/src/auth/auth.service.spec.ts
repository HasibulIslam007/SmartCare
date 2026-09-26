import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthTokenPurpose, Role } from "../generated/prisma/enums";
import { MailService } from "../mail/mail.service";
import { UsersService } from "../users/users.service";
import { AuthTokenService } from "./auth-token.service";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";

const record = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Test Doctor",
  email: "doctor@example.test",
  phone: "+8801700000000",
  role: Role.DOCTOR,
  passwordHash: "hash",
  emailVerifiedAt: null,
  mfaSecret: null,
  mfaEnabledAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function build(
  overrides: {
    users?: Record<string, jest.Mock>;
    tokens?: Record<string, jest.Mock>;
    mfa?: Record<string, jest.Mock>;
    mail?: Record<string, jest.Mock>;
    passwords?: Record<string, jest.Mock>;
    jwt?: Record<string, jest.Mock>;
  } = {},
) {
  const users = {
    findByEmail: jest.fn(),
    findAuthById: jest.fn(),
    updatePassword: jest.fn(),
    markEmailVerified: jest.fn(),
    ...overrides.users,
  };
  const passwords = {
    verify: jest.fn(),
    hash: jest.fn(),
    ...overrides.passwords,
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue("signed-token"),
    verifyAsync: jest.fn(),
    ...overrides.jwt,
  };
  const tokens = {
    issue: jest.fn().mockResolvedValue("raw-token"),
    consume: jest.fn(),
    discardOutstanding: jest.fn(),
    ...overrides.tokens,
  };
  const mfa = {
    verifyFactor: jest.fn(),
    status: jest.fn(),
    ...overrides.mfa,
  };
  const mail = {
    sendEmailVerification: jest.fn().mockResolvedValue({ delivered: false }),
    sendPasswordReset: jest.fn().mockResolvedValue({ delivered: false }),
    ...overrides.mail,
  };
  return {
    service: new AuthService(
      users as unknown as UsersService,
      passwords as unknown as PasswordService,
      jwt as unknown as JwtService,
      tokens as unknown as AuthTokenService,
      mfa as unknown as MfaService,
      mail as unknown as MailService,
    ),
    users,
    passwords,
    jwt,
    tokens,
    mfa,
    mail,
  };
}

describe("AuthService", () => {
  it("uses the same error for unknown emails and wrong passwords", async () => {
    const { service, passwords } = build({
      users: {
        findByEmail: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(record),
      },
      passwords: { verify: jest.fn().mockResolvedValue(false) },
    });
    for (let i = 0; i < 2; i++) {
      await expect(
        service.login({
          email: "unknown@example.com",
          password: "wrong-password",
        }),
      ).rejects.toEqual(new UnauthorizedException("Invalid email or password"));
    }
    expect(passwords.verify).toHaveBeenCalledTimes(2);
  });

  it("returns a session when two-factor is not enabled", async () => {
    const { service } = build({
      users: { findByEmail: jest.fn().mockResolvedValue(record) },
      passwords: { verify: jest.fn().mockResolvedValue(true) },
    });
    const result = await service.login({
      email: record.email,
      password: "correct-password",
    });
    expect(result).toMatchObject({ accessToken: "signed-token", expiresIn: 900 });
    expect(result).not.toHaveProperty("mfaRequired");
  });

  it("withholds the session and issues a challenge when two-factor is on", async () => {
    const { service } = build({
      users: {
        findByEmail: jest
          .fn()
          .mockResolvedValue({ ...record, mfaEnabledAt: new Date() }),
      },
      passwords: { verify: jest.fn().mockResolvedValue(true) },
    });
    const result = await service.login({
      email: record.email,
      password: "correct-password",
    });
    expect(result).toEqual({
      mfaRequired: true,
      challengeToken: "signed-token",
    });
    expect(result).not.toHaveProperty("accessToken");
  });

  it("rejects an MFA challenge when the second factor is wrong", async () => {
    const { service, users } = build({
      jwt: {
        verifyAsync: jest.fn().mockResolvedValue({ sub: record.id, typ: "mfa" }),
      },
      mfa: { verifyFactor: jest.fn().mockResolvedValue(false) },
    });
    await expect(
      service.completeMfaChallenge("challenge", "123456"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.findAuthById).not.toHaveBeenCalled();
  });

  it("refuses to complete a challenge once the factor was disabled", async () => {
    const { service } = build({
      jwt: {
        verifyAsync: jest.fn().mockResolvedValue({ sub: record.id, typ: "mfa" }),
      },
      mfa: { verifyFactor: jest.fn().mockResolvedValue(true) },
      users: { findAuthById: jest.fn().mockResolvedValue(record) },
    });
    await expect(
      service.completeMfaChallenge("challenge", "123456"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("completes a challenge for a valid second factor", async () => {
    const { service } = build({
      jwt: {
        verifyAsync: jest.fn().mockResolvedValue({ sub: record.id, typ: "mfa" }),
      },
      mfa: { verifyFactor: jest.fn().mockResolvedValue(true) },
      users: {
        findAuthById: jest
          .fn()
          .mockResolvedValue({ ...record, mfaEnabledAt: new Date() }),
      },
    });
    await expect(
      service.completeMfaChallenge("challenge", "123456"),
    ).resolves.toMatchObject({ accessToken: "signed-token" });
  });

  it("rejects an access token presented as an MFA challenge", async () => {
    const { service } = build({
      jwt: { verifyAsync: jest.fn().mockRejectedValue(new Error("bad audience")) },
    });
    await expect(
      service.completeMfaChallenge("access-token", "123456"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("answers password reset requests identically for unknown accounts", async () => {
    const { service, tokens, mail } = build({
      users: { findByEmail: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      service.requestPasswordReset("nobody@example.test"),
    ).resolves.toEqual({ accepted: true });
    expect(tokens.issue).not.toHaveBeenCalled();
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("issues and emails a reset token for a known account", async () => {
    const { service, tokens, mail } = build({
      users: { findByEmail: jest.fn().mockResolvedValue(record) },
    });
    await expect(
      service.requestPasswordReset(record.email),
    ).resolves.toEqual({ accepted: true });
    expect(tokens.discardOutstanding).toHaveBeenCalledWith(
      record.id,
      AuthTokenPurpose.PASSWORD_RESET,
    );
    expect(mail.sendPasswordReset).toHaveBeenCalledWith(record.email, "raw-token");
  });

  it("rejects an unusable reset token without touching the password", async () => {
    const { service, users } = build({
      tokens: { consume: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      service.resetPassword("stale-token", "brand-new-password"),
    ).rejects.toThrow("invalid or has expired");
    expect(users.updatePassword).not.toHaveBeenCalled();
  });

  it("hashes the new password when the reset token is claimed", async () => {
    const { service, users, passwords } = build({
      tokens: { consume: jest.fn().mockResolvedValue({ userId: record.id }) },
      passwords: { hash: jest.fn().mockResolvedValue("new-hash") },
    });
    await service.resetPassword("good-token", "brand-new-password");
    expect(users.updatePassword).toHaveBeenCalledWith(record.id, "new-hash");
  });
});
