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
  UsersQuery,
} from "./hospital.dto";

@Controller()
export class HospitalController {
  constructor(private readonly hospital: HospitalService) {}
  @Public() @Get("departments") departments() {
    return this.hospital.departments();
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
    return this.hospital.doctor(id);
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
  @Get("appointments") appointments(@CurrentUser() user: PublicUser) {
    return this.hospital.appointments(user);
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
  @Roles(Role.DOCTOR, Role.PATIENT) @Get("patients/:id/history") history(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: PublicUser,
  ) {
    return this.hospital.history(id, user);
  }
  @Roles(Role.ADMIN) @Get("admin/users") users(@Query() q: UsersQuery) {
    return this.hospital.users(q.search);
  }
  @Roles(Role.ADMIN, Role.RECEPTIONIST) @Get("patients") patients(
    @Query() q: UsersQuery,
  ) {
    return this.hospital.patients(q.search);
  }
  @Roles(Role.ADMIN) @Get("admin/analytics") analytics() {
    return this.hospital.analytics();
  }
}
