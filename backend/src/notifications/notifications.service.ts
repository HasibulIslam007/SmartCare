import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType } from "../generated/prisma/enums";
import { PrismaService } from "../database/prisma.service";
import { PublicUser } from "../users/users.service";

const preferenceField: Record<NotificationType, string | null> = {
  APPOINTMENT_REMINDER: "appointmentAlert",
  QUEUE_UPDATE: "queueAlert",
  REPORT_READY: "reportAlert",
  PRESCRIPTION_READY: "prescriptionAlert",
  SYSTEM: null,
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PrismaService) {}

  async create(input: { userId: string; title: string; message: string; type: NotificationType; eventKey: string }) {
    const field = preferenceField[input.type];
    if (field) {
      const preference = await this.db.notificationPreference.findUnique({ where: { userId: input.userId } });
      if (preference && preference[field as keyof typeof preference] === false) return null;
    }
    return this.db.notification.upsert({ where: { eventKey: input.eventKey }, create: input, update: {} });
  }

  list(user: PublicUser) {
    return this.db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  unreadCount(user: PublicUser) { return this.db.notification.count({ where: { userId: user.id, read: false } }); }

  async markRead(id: string, user: PublicUser) {
    const result = await this.db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
    if (!result.count) throw new NotFoundException("Notification not found");
    return { id, read: true };
  }

  async markAllRead(user: PublicUser) {
    const result = await this.db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return { updated: result.count };
  }

  preferences(user: PublicUser) {
    return this.db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  }

  updatePreferences(user: PublicUser, data: Partial<Record<"appointmentAlert" | "queueAlert" | "reportAlert" | "prescriptionAlert", boolean>>) {
    return this.db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  }
}