import { ForbiddenException } from "@nestjs/common";
import { Role, ReportType } from "../generated/prisma/enums";
import { ReportsService } from "./reports.service";

const user = (role: Role, id = "11111111-1111-4111-8111-111111111111") => ({
  id,
  name: "Test user",
  email: "test@example.test",
  phone: "+8801000000000",
  role,
  emailVerifiedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("ReportsService", () => {
  const report = {
    id: "22222222-2222-4222-8222-222222222222",
    patientId: "33333333-3333-4333-8333-333333333333",
    uploadedById: user(Role.ADMIN).id,
    title: "CBC Blood Test",
    reportType: ReportType.BLOOD_TEST,
    fileName: "cbc-report.pdf",
    mimeType: "application/pdf",
    fileSize: 4,
    description: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function setup() {
    const prisma = {
      medicalReport: {
        create: jest.fn().mockResolvedValue(report),
        findUnique: jest.fn().mockResolvedValue({ ...report, fileKey: "reports/key" }),
      },
      appointment: { findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    const storage = {
      uploadFile: jest.fn().mockResolvedValue("reports/key"),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      generateDownloadUrl: jest.fn().mockResolvedValue("local://temporary-url"),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ReportsService(prisma as never, storage as never, audit), prisma, storage, audit };
  }

  it("uploads a valid file and persists metadata without exposing its storage key", async () => {
    const { service, prisma, storage, audit } = setup();
    const result = await service.create(
      user(Role.ADMIN),
      report.patientId,
      { patientId: report.patientId, title: report.title, reportType: ReportType.BLOOD_TEST },
      { file: Buffer.from("pdf"), filename: "../../cbc-report.pdf", mimeType: "application/pdf" },
    );
    expect(storage.uploadFile).toHaveBeenCalled();
    expect(prisma.medicalReport.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fileName: "cbc-report.pdf", fileKey: "reports/key" }) }));
    expect(result).not.toHaveProperty("fileKey");
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: "REPORT_UPLOADED" }));
  });

  it("rejects a patient attempting to upload for another patient", async () => {
    const { service, storage } = setup();
    await expect(service.create(user(Role.PATIENT), report.patientId, { patientId: report.patientId, title: "x", reportType: ReportType.OTHER }, { file: Buffer.from("x"), filename: "x.pdf", mimeType: "application/pdf" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("returns a signed URL only after an authorized download check", async () => {
    const { service, storage, audit } = setup();
    const result = await service.download(user(Role.ADMIN), report.id);
    expect(result).toEqual({ url: "local://temporary-url", expiresIn: 300 });
    expect(storage.generateDownloadUrl).toHaveBeenCalledWith("reports/key");
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ event: "REPORT_DOWNLOADED" }));
  });

  it("denies receptionist report access", async () => {
    const { service } = setup();
    await expect(service.list(user(Role.RECEPTIONIST), {})).rejects.toBeInstanceOf(ForbiddenException);
  });
});