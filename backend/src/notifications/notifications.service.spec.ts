import { NotFoundException } from "@nestjs/common";
import { NotificationType } from "../generated/prisma/enums";
import { NotificationsService } from "./notifications.service";

const patient = { id: "11111111-1111-4111-8111-111111111111" } as { id: string } & Record<string, unknown>;

describe("NotificationsService", () => {
  function setup() {
    const db = {
      notificationPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      notification: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    return { service: new NotificationsService(db as never), db };
  }

  it("creates an enabled notification idempotently by event key", async () => {
    const { service, db } = setup();
    db.notificationPreference.findUnique.mockResolvedValue({ appointmentAlert: true });
    db.notification.upsert.mockResolvedValue({ id: "notification-1" });

    await service.create({ userId: patient.id, title: "Booked", message: "Ready", type: NotificationType.APPOINTMENT_REMINDER, eventKey: "appointment:1" });

    expect(db.notification.upsert).toHaveBeenCalledWith({
      where: { eventKey: "appointment:1" },
      create: expect.objectContaining({ eventKey: "appointment:1" }),
      update: {},
    });
  });

  it("skips creation when the matching preference is disabled", async () => {
    const { service, db } = setup();
    db.notificationPreference.findUnique.mockResolvedValue({ reportAlert: false });

    await expect(service.create({ userId: patient.id, title: "Report", message: "Ready", type: NotificationType.REPORT_READY, eventKey: "report:1" })).resolves.toBeNull();
    expect(db.notification.upsert).not.toHaveBeenCalled();
  });

  it("restricts read state updates to the owning patient", async () => {
    const { service, db } = setup();
    db.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead("notification-1", patient as never)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.notification.updateMany).toHaveBeenCalledWith({ where: { id: "notification-1", userId: patient.id }, data: { read: true } });
  });

  it("creates default-enabled preferences for a patient", async () => {
    const { service, db } = setup();
    db.notificationPreference.upsert.mockResolvedValue({ userId: patient.id, appointmentAlert: true });

    await service.preferences(patient as never);

    expect(db.notificationPreference.upsert).toHaveBeenCalledWith({ where: { userId: patient.id }, create: { userId: patient.id }, update: {} });
  });
});