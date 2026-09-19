import { Role } from "../generated/prisma/enums";

export const REPORT_AUDIT_SINK = Symbol("REPORT_AUDIT_SINK");

export enum ReportAuditEvent {
  REPORT_UPLOADED = "REPORT_UPLOADED",
  REPORT_VIEWED = "REPORT_VIEWED",
  REPORT_DOWNLOADED = "REPORT_DOWNLOADED",
}

export interface ReportAuditEventInput {
  event: ReportAuditEvent;
  reportId: string;
  actorId: string;
  actorRole: Role;
  occurredAt: Date;
}

export interface ReportAuditSink {
  record(event: ReportAuditEventInput): Promise<void>;
}