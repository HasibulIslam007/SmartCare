import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { REPORT_AUDIT_SINK } from "./reports.audit";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaReportAuditService } from "./prisma-report-audit.service";

@Module({
  imports: [StorageModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaReportAuditService, { provide: REPORT_AUDIT_SINK, useExisting: PrismaReportAuditService }],
})
export class ReportsModule {}
