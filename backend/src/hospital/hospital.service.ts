import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AppointmentStatus, Role } from "../generated/prisma/enums";
import { PublicUser, publicUserSelect } from "../users/users.service";
import {
  BookingDto,
  DepartmentDto,
  DoctorDto,
  DoctorQuery,
  PatientProfileDto,
  RecordDto,
  ScheduleDto,
} from "./hospital.dto";
import { Prisma } from "../generated/prisma/client";

export const doctorInclude = {
  user: { select: { id: true, name: true } },
  department: true,
  schedules: { orderBy: { day: "asc" as const } },
};
export const appointmentInclude = {
  doctor: { include: doctorInclude },
  patient: { select: { id: true, name: true } },
  record: true,
};
export function hospitalToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

@Injectable()
export class HospitalService {
  constructor(private readonly db: PrismaService) {}
  departments() {
    return this.db.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { doctors: true } } },
    });
  }
  async createDepartment(dto: DepartmentDto) {
    try {
      return await this.db.department.create({ data: dto });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        throw new ConflictException("Department already exists");
      throw e;
    }
  }
  doctors(query: DoctorQuery) {
    return this.db.doctor.findMany({
      where: {
        departmentId: query.departmentId,
        user: { role: Role.DOCTOR },
        ...(query.search
          ? {
              OR: [
                {
                  user: {
                    name: { contains: query.search, mode: "insensitive" },
                  },
                },
                {
                  specialization: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: doctorInclude,
      orderBy: { user: { name: "asc" } },
      take: 100,
    });
  }
  async createDoctor(dto: DoctorDto) {
    const user = await this.db.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.role !== Role.DOCTOR)
      throw new BadRequestException(
        "Assign the DOCTOR role before creating a doctor profile",
      );
    if (
      !(await this.db.department.findUnique({
        where: { id: dto.departmentId },
      }))
    )
      throw new NotFoundException("Department not found");
    try {
      return await this.db.doctor.create({ data: dto, include: doctorInclude });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        throw new ConflictException("Doctor profile already exists");
      throw e;
    }
  }
  async doctor(id: string) {
    const doctor = await this.db.doctor.findUnique({
      where: { id },
      include: doctorInclude,
    });
    if (!doctor) throw new NotFoundException("Doctor not found");
    return doctor;
  }
  async authorizeDoctor(id: string, user: PublicUser) {
    const doctor = await this.doctor(id);
    if (
      ![Role.ADMIN, Role.RECEPTIONIST].includes(
        user.role as "ADMIN" | "RECEPTIONIST",
      ) &&
      doctor.userId !== user.id
    )
      throw new ForbiddenException("This queue belongs to another doctor");
    return doctor;
  }
  async schedule(id: string, dto: ScheduleDto, user: PublicUser) {
    await this.authorizeDoctor(id, user);
    if (dto.startTime >= dto.endTime)
      throw new BadRequestException("End time must be after start time");
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, id);
      return tx.schedule.upsert({
        where: { doctorId_day: { doctorId: id, day: dto.day } },
        create: { ...dto, doctorId: id },
        update: dto,
      });
    });
  }
  async availability(id: string, date: string) {
    const doctor = await this.doctor(id);
    const schedule = doctor.schedules.find(
      (s) => s.day === new Date(date).getUTCDay(),
    );
    const booked = await this.db.appointment.count({
      where: {
        doctorId: id,
        date: new Date(date),
        status: { not: AppointmentStatus.CANCELLED },
      },
    });
    return {
      date,
      schedule: schedule ?? null,
      remaining: Math.max(0, (schedule?.maximumPatients ?? 0) - booked),
    };
  }
  private async lock(tx: Prisma.TransactionClient, doctorId: string) {
    // A single doctor row serializes bookings, cancellations and queue transitions.
    await tx.$queryRaw`SELECT id FROM doctors WHERE id = ${doctorId}::uuid FOR UPDATE`;
  }
  async book(dto: BookingDto, user: PublicUser) {
    if (
      user.role === Role.PATIENT &&
      dto.patientId &&
      dto.patientId !== user.id
    )
      throw new ForbiddenException("Book only for your own account");
    const patientId = user.role === Role.PATIENT ? user.id : dto.patientId;
    if (!patientId) throw new BadRequestException("Select a patient");
    const patient = await this.db.user.findUnique({ where: { id: patientId } });
    if (!patient || patient.role !== Role.PATIENT)
      throw new BadRequestException("A patient account is required");
    const today = hospitalToday();
    const days = (Date.parse(dto.date) - Date.parse(today)) / 86400000;
    if (days < 0 || days > 90)
      throw new BadRequestException("Choose a date within the next 90 days");
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, dto.doctorId);
      const doctor = await tx.doctor.findUnique({
        where: { id: dto.doctorId },
        include: { schedules: true, user: true },
      });
      if (!doctor || doctor.user.role !== Role.DOCTOR)
        throw new NotFoundException("Doctor not available");
      const date = new Date(dto.date);
      const schedule = doctor.schedules.find((s) => s.day === date.getUTCDay());
      if (!schedule)
        throw new ConflictException("Doctor is not available on this day");
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());
      if (dto.date === today && time >= schedule.endTime)
        throw new ConflictException("Today’s consultation session has ended");
      const where = { doctorId: dto.doctorId, date };
      if (
        await tx.appointment.findFirst({
          where: {
            ...where,
            patientId,
            status: { not: AppointmentStatus.CANCELLED },
          },
        })
      )
        throw new ConflictException(
          "You already have an appointment with this doctor on this date",
        );
      const count = await tx.appointment.count({
        where: { ...where, status: { not: AppointmentStatus.CANCELLED } },
      });
      if (count >= schedule.maximumPatients)
        throw new ConflictException("This session is fully booked");
      const last = await tx.appointment.aggregate({
        where,
        _max: { serialNumber: true },
      });
      return tx.appointment.create({
        data: {
          ...where,
          patientId,
          reason: dto.reason,
          serialNumber: (last._max.serialNumber ?? 0) + 1,
        },
        include: appointmentInclude,
      });
    });
  }
  appointments(user: PublicUser) {
    const where =
      user.role === Role.PATIENT
        ? { patientId: user.id }
        : user.role === Role.DOCTOR
          ? { doctor: { userId: user.id } }
          : {};
    return this.db.appointment.findMany({
      where,
      include: {
        ...appointmentInclude,
        record: user.role === Role.PATIENT || user.role === Role.DOCTOR,
      },
      orderBy: [{ date: "desc" }, { serialNumber: "asc" }],
      take: 200,
    });
  }
  async cancel(id: string, user: PublicUser) {
    return this.db.$transaction(async (tx) => {
      const a = await tx.appointment.findUnique({ where: { id } });
      if (!a) throw new NotFoundException("Appointment not found");
      if (user.role === Role.PATIENT && a.patientId !== user.id)
        throw new ForbiddenException(
          "This appointment belongs to another patient",
        );
      await this.lock(tx, a.doctorId);
      const result = await tx.appointment.updateMany({
        where: { id, status: AppointmentStatus.WAITING },
        data: { status: AppointmentStatus.CANCELLED },
      });
      if (!result.count)
        throw new ConflictException(
          "Only a waiting appointment can be cancelled",
        );
      return tx.appointment.findUnique({
        where: { id },
        include: appointmentInclude,
      });
    });
  }
  async queue(id: string, date: string, user: PublicUser) {
    await this.doctor(id);
    const appointments = await this.db.appointment.findMany({
      where: { doctorId: id, date: new Date(date) },
      orderBy: { serialNumber: "asc" },
    });
    const own = appointments.find(
      (a) =>
        a.patientId === user.id && a.status !== AppointmentStatus.CANCELLED,
    );
    const current = appointments.find(
      (a) => a.status === AppointmentStatus.CALLED,
    );
    const waiting = appointments.filter(
      (a) => a.status === AppointmentStatus.WAITING,
    );
    return {
      current: current?.serialNumber ?? null,
      next: waiting[0]?.serialNumber ?? null,
      waiting: waiting.length,
      completed: appointments.filter(
        (a) => a.status === AppointmentStatus.COMPLETED,
      ).length,
      ownSerial: own?.serialNumber ?? null,
      ahead: own
        ? waiting.filter((a) => a.serialNumber < own.serialNumber).length +
          (current && current.id !== own.id ? 1 : 0)
        : null,
    };
  }
  async callNext(id: string, date: string, user: PublicUser) {
    await this.authorizeDoctor(id, user);
    if (date !== hospitalToday())
      throw new BadRequestException(
        "Queue changes are only available for today",
      );
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, id);
      const where = { doctorId: id, date: new Date(date) };
      if (
        await tx.appointment.findFirst({
          where: { ...where, status: AppointmentStatus.CALLED },
        })
      )
        throw new ConflictException(
          "Complete the current consultation before calling the next patient",
        );
      const next = await tx.appointment.findFirst({
        where: { ...where, status: AppointmentStatus.WAITING },
        orderBy: { serialNumber: "asc" },
      });
      if (!next) throw new ConflictException("No patients waiting");
      return tx.appointment.update({
        where: { id: next.id },
        data: { status: AppointmentStatus.CALLED },
        include: appointmentInclude,
      });
    });
  }
  async complete(id: string, user: PublicUser) {
    const a = await this.db.appointment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Appointment not found");
    await this.authorizeDoctor(a.doctorId, user);
    return this.db.$transaction(async (tx) => {
      await this.lock(tx, a.doctorId);
      const result = await tx.appointment.updateMany({
        where: { id, status: AppointmentStatus.CALLED },
        data: { status: AppointmentStatus.COMPLETED },
      });
      if (!result.count)
        throw new ConflictException(
          "Only a called appointment can be completed",
        );
      return { id, status: AppointmentStatus.COMPLETED };
    });
  }
  profile(user: PublicUser) {
    return this.db.patientProfile.findUnique({ where: { userId: user.id } });
  }
  saveProfile(dto: PatientProfileDto, user: PublicUser) {
    if (dto.dateOfBirth && dto.dateOfBirth > hospitalToday())
      throw new BadRequestException("Date of birth cannot be in the future");
    const data = {
      ...dto,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    };
    return this.db.patientProfile.upsert({
      where: { userId: user.id },
      create: { ...data, userId: user.id },
      update: data,
    });
  }
  async record(id: string, dto: RecordDto, user: PublicUser) {
    const a = await this.db.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!a) throw new NotFoundException("Appointment not found");
    if (a.doctor.userId !== user.id)
      throw new ForbiddenException(
        "Only the treating doctor can write this record",
      );
    if (
      ![AppointmentStatus.CALLED, AppointmentStatus.COMPLETED].includes(
        a.status as "CALLED" | "COMPLETED",
      )
    )
      throw new ConflictException("Call the patient before writing a record");
    const data = {
      ...dto,
      medicines: dto.medicines.map((m) => ({ ...m })),
      followUp: dto.followUp ? new Date(dto.followUp) : null,
    };
    return this.db.medicalRecord.upsert({
      where: { appointmentId: id },
      create: { ...data, appointmentId: id },
      update: data,
    });
  }
  async history(patientId: string, user: PublicUser) {
    if (user.role === Role.PATIENT && user.id !== patientId)
      throw new ForbiddenException();
    if (
      user.role === Role.DOCTOR &&
      !(await this.db.appointment.findFirst({
        where: {
          patientId,
          doctor: { userId: user.id },
          status: {
            in: [AppointmentStatus.CALLED, AppointmentStatus.COMPLETED],
          },
        },
      }))
    )
      throw new ForbiddenException("No consultation relationship");
    return this.db.medicalRecord.findMany({
      where: { appointment: { patientId } },
      include: {
        appointment: { include: { doctor: { include: doctorInclude } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  users(search?: string) {
    return this.db.user.findMany({
      where: search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {},
      select: publicUserSelect,
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  }
  patients(search?: string) {
    return this.db.user.findMany({
      where: {
        role: Role.PATIENT,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, phone: true },
      take: 50,
    });
  }
  async analytics() {
    const today = new Date(hospitalToday());
    const [patients, doctors, departments, appointments] = await Promise.all([
      this.db.user.count({ where: { role: Role.PATIENT } }),
      this.db.doctor.count(),
      this.db.department.count(),
      this.db.appointment.groupBy({
        by: ["status"],
        where: { date: today },
        _count: true,
      }),
    ]);
    return { patients, doctors, departments, appointments };
  }
}
