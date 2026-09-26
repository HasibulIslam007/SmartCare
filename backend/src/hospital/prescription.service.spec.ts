import { ForbiddenException } from "@nestjs/common";
import { AppointmentStatus, Role } from "../generated/prisma/enums";
import { PrescriptionService } from "./prescription.service";
import { createPrescriptionPdf } from "./prescription-pdf";

const user = (role: Role, id = "11111111-1111-4111-8111-111111111111") => ({ id, name: "Test", email: "test@example.test", phone: "+8801000000000", role, emailVerifiedAt: null, createdAt: new Date(), updatedAt: new Date() });

describe("PrescriptionService", () => {
  it("creates a PDF with hospital branding and prescription content", () => {
    const pdf = createPrescriptionPdf({ hospitalName: "SmartCare Hospital", hospitalAddress: "Dhaka", hospitalPhone: "0123", patientName: "Patient", doctorName: "Doctor", departmentName: "Medicine", date: "2026-09-19", diagnosis: "Flu", advice: "Rest", followUp: null, medicines: [{ medicine: "Medicine A", dose: "1 tablet", frequency: "Daily", duration: "5 days" }] });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("authorizes the patient and returns only a temporary signed URL", async () => {
    const prisma = { prescriptionFile: { findUnique: jest.fn().mockResolvedValue({ fileKey: "private/key", medicalRecord: { appointment: { id: "a", patientId: user(Role.PATIENT).id } } }) }, appointment: { findFirst: jest.fn() } };
    const storage = { generateDownloadUrl: jest.fn().mockResolvedValue("temporary://url") };
    const service = new PrescriptionService(prisma as never, storage as never, {} as never);
    await expect(service.download(user(Role.PATIENT), "file")).resolves.toEqual({ url: "temporary://url", expiresIn: 300 });
    await expect(service.download(user(Role.PATIENT, "99999999-9999-4999-8999-999999999999"), "file")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires a treating relationship for doctors", async () => {
    const prisma = { prescriptionFile: { findUnique: jest.fn().mockResolvedValue({ fileKey: "private/key", medicalRecord: { appointment: { id: "a", patientId: "patient" } } }) }, appointment: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new PrescriptionService(prisma as never, {} as never, {} as never);
    await expect(service.download(user(Role.DOCTOR), "file")).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: [AppointmentStatus.CALLED, AppointmentStatus.COMPLETED] } }) }));
  });
});