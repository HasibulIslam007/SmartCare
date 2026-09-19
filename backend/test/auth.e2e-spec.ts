import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/setup";
import { PrismaService } from "../src/database/prisma.service";
import { Role } from "../src/generated/prisma/enums";

// Explicit opt-in, and all rows use an isolated run-specific email suffix.
const suffix = `${randomUUID()}@example.test`;
const password = "A-test-password-123!";
const account = {
  name: "Test Patient",
  email: `patient-${suffix}`,
  phone: `+8801${Date.now().toString().slice(-9)}`,
  password,
};
let app: INestApplication;
let prisma: PrismaService;
let token: string;
let userId: string;
let adminId: string;
let adminToken: string;

describe("authentication API with PostgreSQL", () => {
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    if (prisma)
      await prisma.user.deleteMany({ where: { email: { endsWith: suffix } } });
    if (app) await app.close();
  });
  it("reports database readiness", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);
    expect(res.body.data.database).toBe("connected");
  });
  it("rejects privileged registration fields", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ ...account, role: "ADMIN" })
      .expect(400);
  });
  it("rejects invalid account data", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ ...account, password: "short", phone: "123" })
      .expect(400);
  });
  it("registers a patient, normalizes email, stores only a hash", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ ...account, email: `  ${account.email.toUpperCase()}  ` })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("PATIENT");
    expect(res.body.data.user.email).toBe(account.email);
    expect(JSON.stringify(res.body)).not.toContain("password");
    token = res.body.data.accessToken;
    userId = res.body.data.user.id;
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });
  it("rejects duplicate accounts", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(account)
      .expect(409);
  });
  it("rate limits registration requests", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(account)
      .expect(409);
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send(account)
      .expect(429);
    expect(res.body.success).toBe(false);
  });
  it("logs in without leaking a password hash", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: account.email, password })
      .expect(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
  it("uses identical errors for unknown accounts and wrong passwords", async () => {
    const a = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: account.email, password: "wrong-password-123" })
      .expect(401);
    const b = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: `absent-${suffix}`, password })
      .expect(401);
    expect(a.body).toEqual(b.body);
  });
  it("protects the current-user route", async () => {
    await request(app.getHttpServer()).get("/api/v1/users/me").expect(401);
    await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer fake")
      .expect(401);
    const res = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.id).toBe(userId);
    expect(res.headers["cache-control"]).toBe("no-store");
  });
  it("rejects expired and incorrectly signed tokens", async () => {
    const jwt = app.get(JwtService);
    const expired = await jwt.signAsync({ sub: userId }, { expiresIn: -1 });
    const invalid = await jwt.signAsync(
      { sub: userId },
      { secret: "different-secret" },
    );
    for (const t of [expired, invalid])
      await request(app.getHttpServer())
        .get("/api/v1/users/me")
        .set("Authorization", `Bearer ${t}`)
        .expect(401);
  });
  it("denies patient role changes", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "ADMIN" })
      .expect(403);
  });
  it("lets an administrator assign a role and applies it to existing tokens", async () => {
    const patient = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const admin = await prisma.user.create({
      data: {
        name: "Test Admin",
        email: `admin-${suffix}`,
        phone: `${account.phone}1`,
        passwordHash: patient.passwordHash,
        role: Role.ADMIN,
      },
    });
    adminId = admin.id;
    adminToken = await app.get(JwtService).signAsync({ sub: adminId });
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "DOCTOR" })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.role).toBe("DOCTOR");
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminId}/role`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "PATIENT" })
      .expect(403);
  });
  it("validates role targets and prevents self-demotion", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${adminId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "PATIENT" })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "SUPERUSER" })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${randomUUID()}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "DOCTOR" })
      .expect(404);
  });
  it("recognizes receptionist role and immediately revokes admin privileges on demotion", async () => {
    await prisma.user.update({
      where: { id: adminId },
      data: { role: Role.RECEPTIONIST },
    });
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "ADMIN" })
      .expect(403);
  });
  it("rejects tokens for deleted users", async () => {
    await prisma.user.delete({ where: { id: adminId } });
    await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(401);
  });
});
