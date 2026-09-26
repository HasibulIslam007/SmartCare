import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { ReportAuditEventInput, ReportAuditSink } from "./reports.audit";

@Injectable()
export class PrismaReportAuditService implements ReportAuditSink {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: ReportAuditEventInput) {
    await this.prisma.reportAudit.create({
      data: {
        reportId: event.reportId,
        actorId: event.actorId,
        actorRole: event.actorRole,
        action: event.event,
        occurredAt: event.occurredAt,
      },
    });
  }
}
