-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('BLOOD_TEST', 'XRAY', 'MRI', 'CT_SCAN', 'ULTRASOUND', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "medical_reports" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "report_type" "ReportType" NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "description" VARCHAR(2000),
    "status" "ReportStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_reports_patient_id_status_created_at_idx" ON "medical_reports"("patient_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "medical_reports_uploaded_by_id_created_at_idx" ON "medical_reports"("uploaded_by_id", "created_at");

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;