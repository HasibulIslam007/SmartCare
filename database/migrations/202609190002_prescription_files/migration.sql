CREATE TABLE "prescription_files" (
    "id" UUID NOT NULL,
    "medical_record_id" UUID NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prescription_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prescription_files_medical_record_id_key" ON "prescription_files"("medical_record_id");

ALTER TABLE "prescription_files" ADD CONSTRAINT "prescription_files_medical_record_id_fkey"
  FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;