-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "archived_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "archived_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "hospital_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" VARCHAR(100) NOT NULL DEFAULT 'SmartCare Hospital',
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "phone" VARCHAR(16) NOT NULL DEFAULT '',
    "email" VARCHAR(254) NOT NULL DEFAULT '',
    "time_zone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Dhaka',
    "booking_window_days" INTEGER NOT NULL DEFAULT 90,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hospital_settings_pkey" PRIMARY KEY ("id")
);

