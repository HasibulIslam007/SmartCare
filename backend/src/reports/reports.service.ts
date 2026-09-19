import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { AppointmentStatus, ReportStatus, ReportType, Role } from "../generated/prisma/enums";
import { PrismaService } from "../database/prisma.service";
import { PublicUser } from "../users/users.service";
import { StorageFile } from "../storage/interfaces/storage.interface";
import { StorageService } from "../storage/storage.service";
import { CreateReportDto, ListReportsQueryDto } from "./reports.dto";
import { REPORT_AUDIT_SINK, ReportAuditEvent, ReportAuditEventInput, ReportAuditSink } from "./reports.audit";

const reportSelect = {
  id: true,
  patientId: true,
  uploadedById: true,
  title: true,
  reportType: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MedicalReportSelect;

type ReportSummary = Prisma.MedicalReportGetPayload<{ select: typeof reportSelect }>;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(REPORT_AUDIT_SINK) private readonly audit: ReportAuditSink,
  ) {}

  async create(user: PublicUser, patientId: string, dto: CreateReportDto, file: StorageFile) {
    await this.assertCanAccessPatient(user, patientId, true);
    const fileKey = await this.storage.uploadFile(file);
    try {
      const report = await this.prisma.medicalReport.create({
        data: {
          patientId,
          uploadedById: user.id,
          title: dto.title.trim(),
          reportType: dto.reportType,
          fileKey,
          fileName: this.safeFileName(file.filename),
          mimeType: file.mimeType,
          fileSize: file.file.length,
          description: dto.description?.trim() || null,
        },
        select: reportSelect,
      });
      await this.emitAudit({ event: ReportAuditEvent.REPORT_UPLOADED, reportId: report.id, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
      return report;
    } catch (error) {
      await this.storage.deleteFile(fileKey).catch(() => undefined);
      throw error;
    }
  }

  async list(user: PublicUser, query: ListReportsQueryDto) {
    if (user.role === Role.RECEPTIONIST) throw new ForbiddenException("Insufficient permissions");
    const page = this.parsePositiveInt(query.page, 1, "page");
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 20, "pageSize"), 100);
    const patientIds = await this.authorizedPatientIds(user);
    const where: Prisma.MedicalReportWhereInput = {
      ...(query.type ? { reportType: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(user.role === Role.PATIENT ? { patientId: user.id } : patientIds ? { patientId: { in: patientIds } } : {}),
    };
    const [reports, total] = await this.prisma.$transaction([
      this.prisma.medicalReport.findMany({ where, select: reportSelect, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.medicalReport.count({ where }),
    ]);
    await Promise.all(reports.map((report) => this.emitAudit({ event: ReportAuditEvent.REPORT_VIEWED, reportId: report.id, actorId: user.id, actorRole: user.role, occurredAt: new Date() })));
    return { reports, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async download(user: PublicUser, reportId: string) {
    const report = await this.prisma.medicalReport.findUnique({ where: { id: reportId }, select: { ...reportSelect, fileKey: true } });
    if (!report) throw new NotFoundException("Report not found");
    await this.assertCanAccessPatient(user, report.patientId, false);
    const url = await this.storage.generateDownloadUrl(report.fileKey);
    await this.emitAudit({ event: ReportAuditEvent.REPORT_DOWNLOADED, reportId, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
    return { url, expiresIn: 300 };
  }

  private async authorizedPatientIds(user: PublicUser): Promise<string[] | null> {
    if (user.role === Role.ADMIN) return null;
    if (user.role !== Role.DOCTOR) return [user.id];
    const appointments = await this.prisma.appointment.findMany({
      where: { doctor: { userId: user.id }, status: { in: [AppointmentStatus.CALLED, AppointmentStatus.COMPLETED] } },
      select: { patientId: true },
      distinct: ["patientId"],
    });
    return appointments.map(({ patientId }) => patientId);
  }

  private async assertCanAccessPatient(user: PublicUser, patientId: string, forUpload: boolean) {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.RECEPTIONIST) throw new ForbiddenException("Insufficient permissions");
    if (user.role === Role.PATIENT) {
      if (forUpload || user.id !== patientId) throw new ForbiddenException("You cannot access this report");
      return;
    }
    if (user.role !== Role.DOCTOR) throw new ForbiddenException("Insufficient permissions");
    const relationship = await this.prisma.appointment.findFirst({
      where: { patientId, doctor: { userId: user.id }, status: { in: [AppointmentStatus.CALLED, AppointmentStatus.COMPLETED] } },
      select: { id: true },
    });
    if (!relationship) throw new ForbiddenException("You cannot access this patient's reports");
  }

  private safeFileName(filename: string) {
    const baseName = filename.replace(/\\/g, "/").split("/").pop() ?? "report";
    return baseName.slice(0, 255);
  }

  private parsePositiveInt(value: string | undefined, fallback: number, field: string) {
    if (value === undefined) return fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new BadRequestException(`${field} must be a positive integer`);
    return parsed;
  }

  private emitAudit(event: ReportAuditEventInput) {
    return this.audit.record(event);
  }
}