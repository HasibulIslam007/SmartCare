import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { REPORT_AUDIT_SINK } from "./reports.audit";

@Module({
  imports: [StorageModule],
  controllers: [ReportsController],
  providers: [ReportsService, { provide: REPORT_AUDIT_SINK, useValue: { record: async () => undefined } }],
})
export class ReportsModule {}