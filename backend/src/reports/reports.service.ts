import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { AppointmentStatus, ReportStatus, ReportType, Role } from "../generated/prisma/enums";
import { PrismaService } from "../database/prisma.service";
import { PublicUser } from "../users/users.service";
import { StorageFile } from "../storage/interfaces/storage.interface";
import { StorageService } from "../storage/storage.service";
import { CreateReportDto, CreateReportShareDto, ListReportsQueryDto } from "./reports.dto";
import { REPORT_AUDIT_SINK, ReportAuditEvent, ReportAuditEventInput, ReportAuditSink } from "./reports.audit";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../generated/prisma/enums";

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
    private readonly notifications?: NotificationsService,
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
      await this.notifications?.create({ userId: patientId, title: "Medical report ready", message: `${report.title} is now available in your medical reports.`, type: NotificationType.REPORT_READY, eventKey: `report:${report.id}` }).catch(() => undefined);
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
    if (query.patientId) await this.assertCanAccessPatient(user, query.patientId, false);
    const where: Prisma.MedicalReportWhereInput = {
      ...(query.type ? { reportType: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.patientId ? { patientId: query.patientId } : user.role === Role.PATIENT ? { patientId: user.id } : patientIds ? { patientId: { in: patientIds } } : {}),
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

  async content(user: PublicUser, reportId: string) {
    const report = await this.reportForAccess(reportId, user);
    await this.emitAudit({ event: ReportAuditEvent.REPORT_DOWNLOADED, reportId, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
    return { buffer: await this.storage.readFile(report.fileKey), fileName: report.fileName, mimeType: report.mimeType };
  }

  async setStatus(user: PublicUser, reportId: string, status: ReportStatus) {
    const report = await this.reportForAccess(reportId, user);
    if (user.role !== Role.ADMIN && report.uploadedById !== user.id) throw new ForbiddenException("Only the uploader or an administrator can change this report");
    const updated = await this.prisma.medicalReport.update({ where: { id: reportId }, data: { status }, select: reportSelect });
    await this.emitAudit({ event: status === ReportStatus.ARCHIVED ? ReportAuditEvent.REPORT_ARCHIVED : ReportAuditEvent.REPORT_RESTORED, reportId, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
    return updated;
  }

  async createShare(user: PublicUser, reportId: string, dto: CreateReportShareDto) {
    const report = await this.reportForAccess(reportId, user);
    if (user.role !== Role.PATIENT || report.patientId !== user.id) throw new ForbiddenException("Only the patient can share this report");
    if (report.status !== ReportStatus.ACTIVE) throw new BadRequestException("Archived reports cannot be shared");
    const token = randomBytes(32).toString("base64url");
    const share = await this.prisma.reportShare.create({ data: {
      reportId,
      createdById: user.id,
      tokenHash: this.tokenHash(token),
      passcodeHash: dto.passcode ? this.passcodeHash(dto.passcode) : null,
      expiresAt: new Date(Date.now() + dto.expiresInDays * 86400000),
      maxDownloads: dto.maxDownloads,
    }, select: { id: true, expiresAt: true, maxDownloads: true, downloadCount: true, revokedAt: true, createdAt: true } });
    await this.emitAudit({ event: ReportAuditEvent.SHARE_CREATED, reportId, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
    return { ...share, token };
  }

  async listShares(user: PublicUser, reportId: string) {
    const report = await this.reportForAccess(reportId, user);
    if (user.role !== Role.PATIENT || report.patientId !== user.id) throw new ForbiddenException("Only the patient can manage sharing");
    return this.prisma.reportShare.findMany({ where: { reportId, createdById: user.id }, select: { id: true, expiresAt: true, maxDownloads: true, downloadCount: true, revokedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  }

  async revokeShare(user: PublicUser, reportId: string, shareId: string) {
    const report = await this.reportForAccess(reportId, user);
    if (user.role !== Role.PATIENT || report.patientId !== user.id) throw new ForbiddenException("Only the patient can manage sharing");
    const result = await this.prisma.reportShare.updateMany({ where: { id: shareId, reportId, createdById: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new NotFoundException("Active share link not found");
    await this.emitAudit({ event: ReportAuditEvent.SHARE_REVOKED, reportId, actorId: user.id, actorRole: user.role, occurredAt: new Date() });
    return { id: shareId, revoked: true };
  }

  async sharedContent(token: string, passcode?: string) {
    const tokenHash = this.tokenHash(token);
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM report_shares WHERE token_hash = ${tokenHash} FOR UPDATE`;
      if (!rows[0]) throw new NotFoundException("Share link not found");
      const share = await tx.reportShare.findUnique({ where: { id: rows[0].id }, include: { report: true } });
      if (!share || share.revokedAt || share.expiresAt <= new Date() || share.report.status !== ReportStatus.ACTIVE) throw new NotFoundException("Share link is expired or unavailable");
      if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) throw new NotFoundException("Share link download limit reached");
      if (share.passcodeHash && (!passcode || !this.verifyPasscode(share.passcodeHash, passcode))) throw new UnauthorizedException("A valid passcode is required");
      await tx.reportShare.update({ where: { id: share.id }, data: { downloadCount: { increment: 1 } } });
      await tx.reportAudit.create({ data: { reportId: share.reportId, action: "SHARE_ACCESSED" } });
      return { buffer: await this.storage.readFile(share.report.fileKey), fileName: share.report.fileName, mimeType: share.report.mimeType };
    });
  }

  private async reportForAccess(reportId: string, user: PublicUser) {
    const report = await this.prisma.medicalReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Report not found");
    await this.assertCanAccessPatient(user, report.patientId, false);
    return report;
  }

  private tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
  private passcodeHash(passcode: string) {
    const salt = randomBytes(16);
    return `${salt.toString("hex")}:${scryptSync(passcode, salt, 32).toString("hex")}`;
  }
  private verifyPasscode(stored: string, passcode: string) {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(passcode, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(expected, actual);
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
