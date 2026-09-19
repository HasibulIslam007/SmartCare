import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { CurrentUser, Public, Roles } from "../common/security";
import { PublicUser } from "../users/users.service";
import { Role } from "../generated/prisma/enums";
import { HospitalService } from "./hospital.service";
import {
  BookingDto,
  DateQuery,
  DepartmentDto,
  DoctorDto,
  DoctorQuery,
  PatientProfileDto,
  RecordDto,
  ScheduleDto,
  UsersQuery, DirectoryQuery, AppointmentQuery, PageQuery, SearchQuery, UpdateDoctorDto, ArchiveDto, SettingsDto,
} from "./hospital.dto";

import { SettingsService } from './settings.service';
import { RegisterDto } from '../auth/auth.dto';
import { PrescriptionService } from './prescription.service';
@Controller()
export class HospitalController {
  constructor(private readonly hospital: HospitalService, private readonly settings: SettingsService, private readonly prescriptions: PrescriptionService) {}
  @Public() @Get("departments") departments(@Query() q: DirectoryQuery) {
    return this.hospital.departments(q);
  }
  @Roles(Role.ADMIN) @Post("departments") createDepartment(
    @Body() dto: DepartmentDto,
  ) {
    return this.hospital.createDepartment(dto);
  }
  @Public() @Get("doctors") doctors(@Query() query: DoctorQuery) {
    return this.hospital.doctors(query);
  }
  @Roles(Role.ADMIN) @Post("doctors") createDoctor(@Body() dto: DoctorDto) {
    return this.hospital.createDoctor(dto);
  }
  @Public() @Get("doctors/:id") doctor(@Param("id", ParseUUIDPipe) id: string) {
    return this.hospital.doctor(id, true);
  }
  @Public() @Get("doctors/:id/availability") availability(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() q: DateQuery,
  ) {
    return this.hospital.availability(id, q.date);
  }
  @Roles(Role.ADMIN, Role.DOCTOR) @Put("doctors/:id/schedules") schedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.schedule(id, dto, user);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT)
  @Post("appointments")
  book(@Body() dto: BookingDto, @CurrentUser() user: PublicUser) {
    return this.hospital.book(dto, user);
  }
  @Get("appointments") appointments(@CurrentUser() user: PublicUser, @Query() q: AppointmentQuery) {
    return this.hospital.appointments(user, q);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT)
  @Patch("appointments/:id/cancel")
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.cancel(id, user);
  }
  @Get("queue/:id") queue(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() q: DateQuery,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.queue(id, q.date, user);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR)
  @Post("queue/:id/next")
  next(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DateQuery,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.callNext(id, dto.date, user);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR)
  @Patch("appointments/:id/complete")
  complete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.complete(id, user);
  }
  @Roles(Role.PATIENT) @Get("patients/me") profile(
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.profile(user);
  }
  @Roles(Role.PATIENT) @Put("patients/me") saveProfile(
    @Body() dto: PatientProfileDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.saveProfile(dto, user);
  }
  @Roles(Role.DOCTOR) @Put("appointments/:id/record") record(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RecordDto,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.record(id, dto, user);
  }
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT) @Get("prescriptions/:id/download") prescriptionDownload(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.prescriptions.download(user, id);
  }
  @Roles(Role.DOCTOR, Role.PATIENT) @Get("patients/:id/history") history(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: PublicUser,
    @Query() q: PageQuery,
  ) {
    return this.hospital.history(id, user, q);
  }
  @Roles(Role.ADMIN) @Get("admin/users") users(@Query() q: UsersQuery) {
    return this.hospital.users(q);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST) @Get("patients") patients(
    @Query() q: SearchQuery,
  ) {
    return this.hospital.patients(q);
  }
  @Roles(Role.ADMIN) @Get("admin/analytics") analytics() {
    return this.hospital.analytics();
  }
  @Public() @Get('settings') getSettings() { return this.settings.get(); }
  @Roles(Role.ADMIN) @Put('admin/settings') updateSettings(@Body() dto: SettingsDto) { return this.settings.update(dto); }
  @Roles(Role.ADMIN) @Get('admin/departments') adminDepartments(@Query() q: DirectoryQuery) { return this.hospital.departments(q, true); }
  @Roles(Role.ADMIN) @Get('admin/doctors') adminDoctors(@Query() q: DoctorQuery) { return this.hospital.doctors(q, true); }
  @Roles(Role.ADMIN) @Put('departments/:id') updateDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DepartmentDto) { return this.hospital.updateDepartment(id, dto); }
  @Roles(Role.ADMIN) @Patch('departments/:id/archive') archiveDepartment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ArchiveDto) { return this.hospital.archiveDepartment(id, dto.archived); }
  @Roles(Role.ADMIN) @Put('doctors/:id') updateDoctor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDoctorDto) { return this.hospital.updateDoctor(id, dto); }
  @Roles(Role.ADMIN) @Patch('doctors/:id/archive') archiveDoctor(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ArchiveDto) { return this.hospital.archiveDoctor(id, dto.archived); }
  @Roles(Role.ADMIN, Role.RECEPTIONIST) @Post('patients') registerPatient(@Body() dto: RegisterDto) { return this.hospital.registerPatient(dto); }
}
