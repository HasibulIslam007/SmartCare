import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/setup";
import { PrismaService } from "../src/database/prisma.service";
import { AuthTokenPurpose, Role } from "../src/generated/prisma/enums";
import { PasswordService } from "../src/auth/password.service";
import { base32Decode, generateTotp } from "../src/auth/totp";
import { MailService } from "../src/mail/mail.service";

const suffix = `${randomUUID()}@example.test`;
const password = "A-test-password-123!";
const newPassword = "Another-test-password-456!";
const registered = {
  name: "Reset Patient",
  email: `reset-${suffix}`,
  phone: `+8801${Date.now().toString().slice(-9)}`,
  password,
};

let app: INestApplication;
let prisma: PrismaService;
let mail: MailService;
let patientToken: string;
let patientId: string;
let staffId: string;
let staffToken: string;
let mfaSecret = "";
let recoveryCodes: string[] = [];
let challengeToken = "";

const auth = (token: string) => `Bearer ${token}`;
const uri = (path: string) => `/api/v1${path}`;
const post = (path: string) => request(app.getHttpServer()).post(uri(path));
const totp = (secret: string) => generateTotp(base32Decode(secret), Date.now());
const lastToken = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1][1] as string;

describe("auth hardening", () => {
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    mail = app.get(MailService);
    // Never call Resend from tests; capture the raw tokens instead.
    jest.spyOn(mail, "sendEmailVerification").mockResolvedValue({ delivered: false });
    jest.spyOn(mail, "sendPasswordReset").mockResolvedValue({ delivered: false });

    const staff = await prisma.user.create({
      data: {
        name: "Test Staff",
        email: `staff-${suffix}`,
        phone: `+8802${Date.now().toString().slice(-9)}`,
        passwordHash: await app.get(PasswordService).hash(password),
        role: Role.RECEPTIONIST,
      },
    });
    staffId = staff.id;
    staffToken = await app.get(JwtService).signAsync({ sub: staff.id });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.notification.deleteMany({ where: { user: { email: { endsWith: suffix } } } });
      await prisma.notificationPreference.deleteMany({ where: { user: { email: { endsWith: suffix } } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: suffix } } });
    }
    await app?.close();
  });

  it("registers a patient, records a pending verification token, and does not gate sign-in", async () => {
    const res = await post("/auth/register").send(registered).expect(201);
    patientId = res.body.data.user.id;
    patientToken = res.body.data.accessToken;
    expect(res.body.data.user.emailVerifiedAt).toBeNull();

    const pending = await prisma.authToken.findMany({
      where: { userId: patientId, purpose: AuthTokenPurpose.EMAIL_VERIFICATION },
    });
    expect(pending).toHaveLength(1);
    // Only the digest is persisted, never the token itself.
    expect(pending[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(pending[0].usedAt).toBeNull();

    // "Track but do not enforce": sign-in still succeeds while unverified.
    await post("/auth/login").send({ email: registered.email, password }).expect(200);
  });

  it("confirms an email address once and rejects a replayed link", async () => {
    const token = lastToken(mail.sendEmailVerification as jest.Mock);
    await post("/auth/verify-email").send({ token }).expect(200);
    await post("/auth/verify-email").send({ token }).expect(400);

    const me = await request(app.getHttpServer())
      .get(uri("/users/me"))
      .set("Authorization", auth(patientToken))
      .expect(200);
    expect(me.body.data.emailVerifiedAt).not.toBeNull();
  });

  it("rejects unknown and malformed verification tokens", async () => {
    await post("/auth/verify-email").send({ token: "a".repeat(43) }).expect(400);
    await post("/auth/verify-email").send({ token: "short" }).expect(400);
  });

  it("answers password reset identically for unknown and known accounts", async () => {
    const unknown = await post("/auth/forgot-password")
      .send({ email: `absent-${suffix}` })
      .expect(200);
    const known = await post("/auth/forgot-password")
      .send({ email: registered.email })
      .expect(200);
    expect(known.body).toEqual(unknown.body);
    await expect(
      prisma.authToken.count({
        where: { purpose: AuthTokenPurpose.PASSWORD_RESET },
      }),
    ).resolves.toBe(1);
  });

  it("resets the password through a single-use link", async () => {
    const token = lastToken(mail.sendPasswordReset as jest.Mock);
    await post("/auth/reset-password").send({ token, password: newPassword }).expect(200);
    // The same link must not work twice.
    await post("/auth/reset-password")
      .send({ token, password: "Third-test-password-789!" })
      .expect(400);
    await post("/auth/login").send({ email: registered.email, password }).expect(401);
    await post("/auth/login").send({ email: registered.email, password: newPassword }).expect(200);
  });

  it("rejects a stale password reset token", async () => {
    await post("/auth/reset-password")
      .send({ token: "b".repeat(43), password: newPassword })
      .expect(400);
  });

  it("enrols and activates an authenticator, then withholds the session at sign-in", async () => {
    // Nothing to activate until setup has started.
    await post("/auth/mfa/activate")
      .set("Authorization", auth(staffToken))
      .send({ code: "000000" })
      .expect(400);

    const enroll = await post("/auth/mfa/enroll")
      .set("Authorization", auth(staffToken))
      .expect(200);
    mfaSecret = enroll.body.data.secret;
    expect(mfaSecret).toMatch(/^[A-Z2-7]+$/);
    expect(enroll.body.data.keyUri).toContain("otpauth://totp/");
    // The secret is never echoed back on the public user object.
    expect(JSON.stringify(enroll.body)).not.toContain("mfaSecret");

    // A wrong code must not switch the factor on.
    await post("/auth/mfa/activate")
      .set("Authorization", auth(staffToken))
      .send({ code: "111111" })
      .expect(401);

    const activate = await post("/auth/mfa/activate")
      .set("Authorization", auth(staffToken))
      .send({ code: totp(mfaSecret) })
      .expect(200);
    recoveryCodes = activate.body.data.recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);

    const status = await request(app.getHttpServer())
      .get(uri("/auth/mfa"))
      .set("Authorization", auth(staffToken))
      .expect(200);
    expect(status.body.data).toMatchObject({ enabled: true, recoveryCodesRemaining: 10 });

    // Password alone is no longer sufficient.
    const login = await post("/auth/login")
      .send({ email: `staff-${suffix}`, password })
      .expect(200);
    expect(login.body.data.mfaRequired).toBe(true);
    expect(login.body.data.accessToken).toBeUndefined();
    challengeToken = login.body.data.challengeToken;
    expect(challengeToken).toEqual(expect.any(String));
  });

  it("never accepts an access token as an MFA challenge", async () => {
    // Signed for the API audience, so it must not open an MFA challenge.
    await post("/auth/mfa/challenge")
      .send({ challengeToken: staffToken, code: totp(mfaSecret) })
      .expect(401);
    // Well-formed but not a JWT.
    await post("/auth/mfa/challenge")
      .send({ challengeToken: "x".repeat(40), code: totp(mfaSecret) })
      .expect(401);
    // Rejected by validation before it ever reaches the service.
    await post("/auth/mfa/challenge")
      .send({ challengeToken: "not-a-token", code: totp(mfaSecret) })
      .expect(400);
  });

  it("completes the challenge with an authenticator code but not a wrong one", async () => {
    await post("/auth/mfa/challenge")
      .send({ challengeToken, code: "222222" })
      .expect(401);

    const res = await post("/auth/mfa/challenge")
      .send({ challengeToken, code: totp(mfaSecret) })
      .expect(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.role).toBe("RECEPTIONIST");
  });

  it("accepts each recovery code exactly once", async () => {
    await post("/auth/mfa/challenge")
      .send({ challengeToken, code: recoveryCodes[0] })
      .expect(200);
    // Replaying the same recovery code must fail.
    await post("/auth/mfa/challenge")
      .send({ challengeToken, code: recoveryCodes[0] })
      .expect(401);
    await post("/auth/mfa/challenge")
      .send({ challengeToken, code: recoveryCodes[1] })
      .expect(200);

    const status = await request(app.getHttpServer())
      .get(uri("/auth/mfa"))
      .set("Authorization", auth(staffToken))
      .expect(200);
    expect(status.body.data.recoveryCodesRemaining).toBe(8);
  });

  it("keeps MFA management away from patients", async () => {
    await post("/auth/mfa/enroll")
      .set("Authorization", auth(patientToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(uri("/auth/mfa"))
      .set("Authorization", auth(patientToken))
      .expect(403);
    await post("/auth/mfa/disable")
      .set("Authorization", auth(patientToken))
      .send({ code: "123456" })
      .expect(403);
  });

  it("requires a valid factor to disable two-factor authentication", async () => {
    await post("/auth/mfa/disable")
      .set("Authorization", auth(staffToken))
      .send({ code: "333333" })
      .expect(401);

    await post("/auth/mfa/disable")
      .set("Authorization", auth(staffToken))
      .send({ code: totp(mfaSecret) })
      .expect(200);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: { mfaSecret: true, mfaEnabledAt: true },
    });
    expect(after.mfaSecret).toBeNull();
    expect(after.mfaEnabledAt).toBeNull();
    // Recovery codes are cleared along with the factor.
    await expect(
      prisma.mfaRecoveryCode.count({ where: { userId: staffId } }),
    ).resolves.toBe(0);

    const login = await post("/auth/login")
      .send({ email: `staff-${suffix}`, password })
      .expect(200);
    expect(login.body.data.mfaRequired).toBeUndefined();
    expect(login.body.data.accessToken).toEqual(expect.any(String));
  });
});
