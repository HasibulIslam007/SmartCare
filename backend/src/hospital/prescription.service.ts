import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { AppointmentStatus, Role } from "../generated/prisma/enums";
import { PrismaService } from "../database/prisma.service";
import { PublicUser } from "../users/users.service";
import { StorageService } from "../storage/storage.service";
import { SettingsService } from "./settings.service";
import { createPrescriptionPdf } from "./prescription-pdf";

@Injectable()
export class PrescriptionService {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService, private readonly settings: SettingsService) {}

  async generate(medicalRecordId: string) {
    const record = await this.db.medicalRecord.findUnique({ where: { id: medicalRecordId }, include: { appointment: { include: { patient: true, doctor: { include: { user: true, department: true } } } }, prescriptionFile: true } });
    if (!record) throw new NotFoundException("Medical record not found");
    const hospital = await this.settings.get();
    const pdf = createPrescriptionPdf({ hospitalName: hospital.name, hospitalAddress: hospital.address, hospitalPhone: hospital.phone, patientName: record.appointment.patient.name, doctorName: record.appointment.doctor.user.name, departmentName: record.appointment.doctor.department.name, date: record.appointment.date.toISOString().slice(0, 10), diagnosis: record.diagnosis, advice: record.advice, followUp: record.followUp?.toISOString().slice(0, 10) ?? null, medicines: record.medicines as Array<{ medicine: string; dose: string; frequency: string; duration: string }> });
    const fileKey = await this.storage.uploadFile({ file: pdf, filename: "prescription.pdf", mimeType: "application/pdf" });
    try {
      const file = await this.db.prescriptionFile.upsert({ where: { medicalRecordId }, create: { medicalRecordId, fileKey, fileName: "prescription.pdf", mimeType: "application/pdf", fileSize: pdf.length }, update: { fileKey, fileName: "prescription.pdf", mimeType: "application/pdf", fileSize: pdf.length } });
      if (record.prescriptionFile?.fileKey && record.prescriptionFile.fileKey !== fileKey) await this.storage.deleteFile(record.prescriptionFile.fileKey).catch(() => undefined);
      return file;
    } catch (error) {
      await this.storage.deleteFile(fileKey).catch(() => undefined);
      throw error;
    }
  }

  async download(user: PublicUser, fileId: string) {
    const file = await this.db.prescriptionFile.findUnique({ where: { id: fileId }, include: { medicalRecord: { include: { appointment: true } } } });
    if (!file) throw new NotFoundException("Prescription not found");
    const appointment = file.medicalRecord.appointment;
    if (user.role === Role.PATIENT && user.id !== appointment.patientId) throw new ForbiddenException("You cannot access this prescription");
    if (user.role === Role.DOCTOR && !(await this.db.appointment.findFirst({ where: { id: appointment.id, doctor: { userId: user.id }, status: { in: [AppointmentStatus.CALLED, AppointmentStatus.COMPLETED] } }, select: { id: true } }))) throw new ForbiddenException("You cannot access this prescription");
    if (user.role !== Role.PATIENT && user.role !== Role.DOCTOR && user.role !== Role.ADMIN) throw new ForbiddenException("Insufficient permissions");
    return { url: await this.storage.generateDownloadUrl(file.fileKey), expiresIn: 300 };
  }
}