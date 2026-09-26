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
import { hospitalToday } from "../src/hospital/hospital.service";

const suffix = `${randomUUID()}@example.test`;
let app: INestApplication;
let db: PrismaService;
let doctorId: string;
let departmentId: string;
let appointmentId: string;
const actors: Record<string, { id: string; token: string }> = {};
const date = hospitalToday();
const nextDay = new Date(Date.parse(date) + 86400000)
  .toISOString()
  .slice(0, 10);
const record = {
  notes: "Test consultation",
  diagnosis: "Test finding",
  advice: "Test advice",
  medicines: [
    {
      medicine: "Test medicine",
      dose: "Test dose",
      frequency: "Test frequency",
      duration: "Test duration",
    },
  ],
};
const auth = (name: string) => `Bearer ${actors[name].token}`;

describe("hospital workflow", () => {
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    const identities = [
      ["patient", Role.PATIENT],
      ["other", Role.PATIENT],
      ["third", Role.PATIENT],
      ["doctor", Role.DOCTOR],
      ["unassigned", Role.DOCTOR],
      ["reception", Role.RECEPTIONIST],
      ["admin", Role.ADMIN],
    ] as const;
    for (const [name, role] of identities) {
      const user = await db.user.create({
        data: {
          name,
          email: `${name}-${suffix}`,
          phone:
            "+" +
            BigInt(
              "0x" + randomUUID().replace(/-/g, "").slice(0, 12),
            ).toString(),
          passwordHash: "not-a-login-fixture",
          role,
        },
      });
      actors[name] = {
        id: user.id,
        token: await app.get(JwtService).signAsync({ sub: user.id }),
      };
    }
    const dept = await db.department.create({
      data: {
        name: `Test ${suffix}`,
        description: "Test department",
        location: "Test floor",
      },
    });
    departmentId = dept.id;
    const doctor = await db.doctor.create({
      data: {
        userId: actors.doctor.id,
        departmentId,
        qualification: "Test qualification",
        specialization: "Test specialty",
        experience: 5,
        consultationFee: 1000,
        roomNumber: "TEST",
      },
    });
    doctorId = doctor.id;
    for (let day = 0; day < 7; day++)
      await db.schedule.create({
        data: {
          doctorId,
          day,
          startTime: "00:00",
          endTime: "23:59",
          maximumPatients: 2,
        },
      });
  });
  afterAll(async () => {
    if (db) {
      // Prescription files reference medical records with RESTRICT, so they go first.
      await db.prescriptionFile.deleteMany({
        where: { medicalRecord: { appointment: { doctorId } } },
      });
      await db.medicalRecord.deleteMany({
        where: { appointment: { doctorId } },
      });
      await db.appointment.deleteMany({ where: { doctorId } });
      await db.schedule.deleteMany({ where: { doctorId } });
      await db.doctor.deleteMany({ where: { id: doctorId } });
      await db.department.deleteMany({ where: { id: departmentId } });
      // Notifications and preferences reference users with RESTRICT.
      await db.notification.deleteMany({
        where: { user: { email: { endsWith: suffix } } },
      });
      await db.notificationPreference.deleteMany({
        where: { user: { email: { endsWith: suffix } } },
      });
      await db.user.deleteMany({ where: { email: { endsWith: suffix } } });
    }
    await app?.close();
  });
  it("publishes directory without staff credentials", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/doctors")
      .expect(200);
    expect(
      res.body.data.items.some((d: { id: string }) => d.id === doctorId),
    ).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain(actors.doctor.token);
  });
  it("blocks patients from adding departments or editing schedules", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/departments")
      .set("Authorization", auth("patient"))
      .send({
        name: "Invalid",
        description: "Invalid department",
        location: "First floor",
      })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/doctors/${doctorId}/schedules`)
      .set("Authorization", auth("unassigned"))
      .send({
        day: 0,
        startTime: "10:00",
        endTime: "12:00",
        maximumPatients: 2,
      })
      .expect(403);
  });
  it("rejects invalid dates and booking on behalf of someone else", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .send({ doctorId, date: "2026-02-31", reason: "Check-up" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .send({ doctorId, date, reason: "Check-up", patientId: actors.other.id })
      .expect(403);
    await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .send({ doctorId, date: "2020-01-01", reason: "Check-up" })
      .expect(400);
  });
  it("serializes simultaneous bookings and enforces capacity", async () => {
    const results = await Promise.all(
      ["patient", "other", "third"].map((name) =>
        request(app.getHttpServer())
          .post("/api/v1/appointments")
          .set("Authorization", auth(name))
          .send({ doctorId, date: nextDay, reason: "Concurrent test visit" }),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    expect(
      results
        .filter((r) => r.status === 201)
        .map((r) => r.body.data.serialNumber)
        .sort(),
    ).toEqual([1, 2]);
  });
  it("books today, rejects duplicates and protects patient access", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .send({ doctorId, date, reason: "Test visit today" })
      .expect(201);
    appointmentId = res.body.data.id;
    await request(app.getHttpServer())
      .post("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .send({ doctorId, date, reason: "Duplicate visit" })
      .expect(409);
    const other = await request(app.getHttpServer())
      .get("/api/v1/appointments")
      .set("Authorization", auth("other"))
      .expect(200);
    expect(
      other.body.data.items.some((a: { id: string }) => a.id === appointmentId),
    ).toBe(false);
    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set("Authorization", auth("other"))
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/record`)
      .set("Authorization", auth("doctor"))
      .send(record)
      .expect(409);
  });
  it("calls next patient, prevents skipping an active consultation and hides identity in queue", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/queue/${doctorId}/next`)
      .set("Authorization", auth("unassigned"))
      .send({ date })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/queue/${doctorId}/next`)
      .set("Authorization", auth("doctor"))
      .send({ date })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/queue/${doctorId}/next`)
      .set("Authorization", auth("doctor"))
      .send({ date })
      .expect(409);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/queue/${doctorId}?date=${date}`)
      .set("Authorization", auth("patient"))
      .expect(200);
    expect(res.body.data.current).toBe(1);
    expect(res.body.data.ownSerial).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain("patientId");
  });
  it("writes prescriptions only as treating doctor and excludes records from reception responses", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/record`)
      .set("Authorization", auth("unassigned"))
      .send(record)
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/appointments/${appointmentId}/record`)
      .set("Authorization", auth("doctor"))
      .send(record)
      .expect(200);
    const own = await request(app.getHttpServer())
      .get("/api/v1/appointments")
      .set("Authorization", auth("patient"))
      .expect(200);
    expect(
      own.body.data.items.find((a: { id: string }) => a.id === appointmentId)
        .record.diagnosis,
    ).toBe(record.diagnosis);
    const reception = await request(app.getHttpServer())
      .get("/api/v1/appointments")
      .set("Authorization", auth("reception"))
      .expect(200);
    expect(JSON.stringify(reception.body)).not.toContain("Test finding");
    await request(app.getHttpServer())
      .get(`/api/v1/patients/${actors.patient.id}/history`)
      .set("Authorization", auth("other"))
      .expect(403);
  });
  it("completes consultations and enforces transitions", async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", auth("doctor"))
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${appointmentId}/complete`)
      .set("Authorization", auth("doctor"))
      .send({})
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set("Authorization", auth("patient"))
      .send({})
      .expect(409);
  });
  it("persists profiles and rejects a future birthday", async () => {
    await request(app.getHttpServer())
      .put("/api/v1/patients/me")
      .set("Authorization", auth("patient"))
      .send({ dateOfBirth: nextDay })
      .expect(400);
    await request(app.getHttpServer())
      .put("/api/v1/patients/me")
      .set("Authorization", auth("patient"))
      .send({ bloodGroup: "B+", allergies: "None" })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get("/api/v1/patients/me")
      .set("Authorization", auth("patient"))
      .expect(200);
    expect(res.body.data.bloodGroup).toBe("B+");
  });
});
