CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT_REMINDER', 'QUEUE_UPDATE', 'REPORT_READY', 'PRESCRIPTION_READY', 'SYSTEM');

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "type" "NotificationType" NOT NULL,
  "event_key" VARCHAR(255) NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "notification_preferences" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "appointment_alert" BOOLEAN NOT NULL DEFAULT true,
  "queue_alert" BOOLEAN NOT NULL DEFAULT true,
  "report_alert" BOOLEAN NOT NULL DEFAULT true,
  "prescription_alert" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;