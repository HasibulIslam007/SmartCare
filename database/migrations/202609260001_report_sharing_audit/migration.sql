CREATE TYPE "ReportAuditAction" AS ENUM (
  'REPORT_UPLOADED', 'REPORT_VIEWED', 'REPORT_DOWNLOADED',
  'REPORT_ARCHIVED', 'REPORT_RESTORED', 'SHARE_CREATED',
  'SHARE_ACCESSED', 'SHARE_REVOKED'
);

CREATE TABLE "report_shares" (
  "id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "created_by_id" UUID NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "passcode_hash" VARCHAR(255),
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "max_downloads" INTEGER,
  "download_count" INTEGER NOT NULL DEFAULT 0,
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "report_shares_token_hash_key" ON "report_shares"("token_hash");
CREATE INDEX "report_shares_report_id_created_at_idx" ON "report_shares"("report_id", "created_at");
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "medical_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "report_audits" (
  "id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "actor_id" UUID,
  "actor_role" "Role",
  "action" "ReportAuditAction" NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "report_audits_report_id_occurred_at_idx" ON "report_audits"("report_id", "occurred_at");
CREATE INDEX "report_audits_actor_id_occurred_at_idx" ON "report_audits"("actor_id", "occurred_at");
ALTER TABLE "report_audits" ADD CONSTRAINT "report_audits_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "medical_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_audits" ADD CONSTRAINT "report_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_max_downloads_check" CHECK ("max_downloads" IS NULL OR "max_downloads" > 0);
