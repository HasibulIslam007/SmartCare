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
  DirectoryQuery, AppointmentQuery, PageQuery, UsersQuery, SearchQuery, UpdateDoctorDto,
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
import { SettingsService, hospitalToday } from './settings.service';
export { hospitalToday } from './settings.service';
import { pageArgs, pageResult } from './pagination';
import { PasswordService } from '../auth/password.service';
import { RegisterDto } from '../auth/auth.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class HospitalService {
  constructor(private readonly db: PrismaService, private readonly settings: SettingsService, private readonly passwords: PasswordService, private readonly userService: UsersService) {}
  private archiveWhere(state: DirectoryQuery['state']) { return state === 'all' ? {} : { archivedAt: state === 'archived' ? { not: null } : null }; }
  async departments(query: DirectoryQuery, admin = false) {
    const where: Prisma.DepartmentWhereInput = { ...this.archiveWhere(admin ? query.state : 'active'), ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.department.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], include: { _count: { select: { doctors: { where: { archivedAt: null } } } } }, ...pageArgs(query) }),
      this.db.department.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
  }
  async doctors(query: DoctorQuery, admin = false) {
    const where: Prisma.DoctorWhereInput = {
      ...this.archiveWhere(admin ? query.state : 'active'), departmentId: query.departmentId,
      ...(!admin ? { user: { role: Role.DOCTOR }, department: { archivedAt: null } } : {}),
      ...(query.search ? { OR: [{ user: { name: { contains: query.search, mode: 'insensitive' } } }, { specialization: { contains: query.search, mode: 'insensitive' } }, { department: { name: { contains: query.search, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await this.db.$transaction([
      this.db.doctor.findMany({ where, include: doctorInclude, orderBy: [{ user: { name: 'asc' } }, { id: 'asc' }], ...pageArgs(query) }),
      this.db.doctor.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
  }
  private async catalogChange<T>(change: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.db.$transaction(async tx => {
        // Serialize catalog changes; booking shares the doctor-row lock below.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(7319002)`;
        return change(tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('A profile with these details already exists');
        if (error.code === 'P2025') throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }
  createDepartment(dto: DepartmentDto) { return this.catalogChange(tx => tx.department.create({ data: dto })); }
  updateDepartment(id: string, dto: DepartmentDto) { return this.catalogChange(tx => tx.department.update({ where: { id }, data: dto })); }
  archiveDepartment(id: string, archived: boolean) {
    return this.catalogChange(async tx => {
      const department = await tx.department.findUnique({ where: { id } });
      if (!department) throw new NotFoundException('Department not found');
      if (archived && await tx.doctor.count({ where: { departmentId: id, archivedAt: null } })) throw new ConflictException('Move or archive this department’s active doctors first');
      return tx.department.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    });
  }
  createDoctor(dto: DoctorDto) {
    return this.catalogChange(async tx => {
      const user = await tx.user.findUnique({ where: { id: dto.userId } });
      if (!user || user.role !== Role.DOCTOR) throw new BadRequestException('Assign the DOCTOR role before creating a doctor profile');
      const department = await tx.department.findFirst({ where: { id: dto.departmentId, archivedAt: null } });
      if (!department) throw new BadRequestException('Choose an active department');
      return tx.doctor.create({ data: dto, include: doctorInclude });
    });
  }
  updateDoctor(id: string, dto: UpdateDoctorDto) {
    return this.catalogChange(async tx => {
      await this.lock(tx, id);
      const doctor = await tx.doctor.findUnique({ where: { id } });
      if (!doctor) throw new NotFoundException('Doctor not found');
      if (!await tx.department.findFirst({ where: { id: dto.departmentId, archivedAt: null } })) throw new BadRequestException('Choose an active department');
      const { name, ...data } = dto;
      await tx.user.update({ where: { id: doctor.userId }, data: { name } });
      return tx.doctor.update({ where: { id }, data, include: doctorInclude });
    });
  }
  archiveDoctor(id: string, archived: boolean) {
    return this.catalogChange(async tx => {
      await this.lock(tx, id);
      const doctor = await tx.doctor.findUnique({ where: { id }, include: { department: true, user: true } });
      if (!doctor) throw new NotFoundException('Doctor not found');
      if (archived && await tx.appointment.count({ where: { doctorId: id, status: { in: ['WAITING', 'CALLED'] } } })) throw new ConflictException('Complete or cancel this doctor’s waiting and called visits before archiving');
      if (!archived && (doctor.department.archivedAt || doctor.user.role !== Role.DOCTOR)) throw new ConflictException('Restore the department and assign the DOCTOR role before restoring this profile');
      return tx.doctor.update({ where: { id }, data: { archivedAt: archived ? new Date() : null }, include: doctorInclude });
    });
  }
  async registerPatient(dto: RegisterDto) {
    return this.userService.createPatient({ name: dto.name, email: dto.email, phone: dto.phone, passwordHash: await this.passwords.hash(dto.password) });
  }
  async doctor(id: string, publicOnly = false) {
    const doctor = await this.db.doctor.findUnique({
      where: { id },
      include: doctorInclude,
    });
    if (!doctor || (publicOnly && (doctor.archivedAt || doctor.department.archivedAt))) throw new NotFoundException("Doctor not found");
    if (publicOnly && !await this.db.user.findFirst({ where: { id: doctor.userId, role: Role.DOCTOR } })) throw new NotFoundException('Doctor not available');
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
    const settings = await this.settings.get();
    const doctor = await this.doctor(id, true);
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
      remaining: this.bookableDate(date, settings.timeZone, settings.bookingWindowDays, schedule?.endTime) ? Math.max(0, (schedule?.maximumPatients ?? 0) - booked) : 0,
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
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hospital_settings WHERE id = 'main' FOR SHARE`;
      const settings = await tx.hospitalSettings.findUniqueOrThrow({ where: { id: 'main' } });
      const today = hospitalToday(settings.timeZone);
      const days = (Date.parse(dto.date) - Date.parse(today)) / 86400000;
      if (days < 0 || days > settings.bookingWindowDays) throw new BadRequestException(`Choose a date within the next ${settings.bookingWindowDays} days`);
      await this.lock(tx, dto.doctorId);
      const doctor = await tx.doctor.findUnique({
        where: { id: dto.doctorId },
        include: { schedules: true, user: true, department: true },
      });
      if (!doctor || doctor.archivedAt || doctor.department.archivedAt || doctor.user.role !== Role.DOCTOR)
        throw new NotFoundException("Doctor not available");
      const date = new Date(dto.date);
      const schedule = doctor.schedules.find((s) => s.day === date.getUTCDay());
      if (!schedule)
        throw new ConflictException("Doctor is not available on this day");
      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: settings.timeZone,
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
  private bookableDate(date: string, timeZone: string, window: number, endTime?: string) {
    const today = hospitalToday(timeZone);
    const days = (Date.parse(date) - Date.parse(today)) / 86400000;
    const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    return !!endTime && days >= 0 && days <= window && (date !== today || time < endTime);
  }
  async appointments(user: PublicUser, query: AppointmentQuery) {
    const access: Prisma.AppointmentWhereInput = user.role === Role.PATIENT ? { patientId: user.id } : user.role === Role.DOCTOR ? { doctor: { userId: user.id } } : {};
    const where: Prisma.AppointmentWhereInput = { AND: [access, {
      doctorId: query.doctorId, date: query.date ? new Date(query.date) : undefined,
      ...(query.view === 'active' ? { status: { in: ['WAITING', 'CALLED'] } } : query.view === 'history' ? { status: { in: ['COMPLETED', 'CANCELLED'] } } : query.view === 'records' ? { record: { isNot: null } } : {}),
      ...(query.search ? { OR: [{ patient: { name: { contains: query.search, mode: 'insensitive' } } }, { doctor: { user: { name: { contains: query.search, mode: 'insensitive' } } } }] } : {}),
    }, query.status ? { status: query.status } : {}] };
    const [items, total] = await this.db.$transaction([
      this.db.appointment.findMany({ where, include: { ...appointmentInclude, record: user.role === Role.PATIENT || user.role === Role.DOCTOR }, orderBy: [{ date: query.view === 'active' || query.date ? 'asc' : 'desc' }, { serialNumber: 'asc' }, { id: 'asc' }], ...pageArgs(query) }),
      this.db.appointment.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
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
    if (date !== hospitalToday((await this.settings.get()).timeZone))
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
  async saveProfile(dto: PatientProfileDto, user: PublicUser) {
    if (dto.dateOfBirth && dto.dateOfBirth > hospitalToday((await this.settings.get()).timeZone))
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
  async history(patientId: string, user: PublicUser, query: PageQuery) {
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
    const where = { appointment: { patientId } };
    const [items, total] = await this.db.$transaction([
      this.db.medicalRecord.findMany({ where, include: { appointment: { include: { doctor: { include: doctorInclude } } } }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], ...pageArgs(query) }),
      this.db.medicalRecord.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
  }
  async users(query: UsersQuery) {
    const where: Prisma.UserWhereInput = { role: query.role, ...(query.withoutDoctorProfile ? { doctor: null } : {}), ...(query.search ? { OR: [{ email: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }, { phone: { contains: query.search } }] } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({ where, select: publicUserSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], ...pageArgs(query) }),
      this.db.user.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
  }
  async patients(query: SearchQuery) {
    const where: Prisma.UserWhereInput = { role: Role.PATIENT, ...(query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { phone: { contains: query.search } }, { email: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.user.findMany({ where, select: { id: true, name: true, phone: true, email: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], ...pageArgs(query) }),
      this.db.user.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    return pageResult(items, total, query);
  }
  async analytics() {
    const today = new Date(hospitalToday((await this.settings.get()).timeZone));
    const [patients, doctors, departments, appointments] = await Promise.all([
      this.db.user.count({ where: { role: Role.PATIENT } }),
      this.db.doctor.count({ where: { archivedAt: null, department: { archivedAt: null }, user: { role: Role.DOCTOR } } }),
      this.db.department.count({ where: { archivedAt: null } }),
      this.db.appointment.groupBy({
        by: ["status"],
        where: { date: today },
        _count: true,
      }),
    ]);
    return { patients, doctors, departments, appointments };
  }
}
