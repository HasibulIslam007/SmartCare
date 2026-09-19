import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
  IsIn,
  IsBoolean,
  IsEmail,
  IsEnum,
  ValidateIf,
} from "class-validator";

export class DepartmentDto {
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(5, 500) description!: string;
  @IsString() @Length(2, 100) location!: string;
}
export class DoctorDto {
  @IsUUID() userId!: string;
  @IsUUID() departmentId!: string;
  @IsString() @Length(2, 200) qualification!: string;
  @IsString() @Length(2, 100) specialization!: string;
  @IsInt() @Min(0) @Max(70) experience!: number;
  @IsInt() @Min(0) @Max(100000) consultationFee!: number;
  @IsString() @Length(1, 30) roomNumber!: string;
}
export class ScheduleDto {
  @IsInt() @Min(0) @Max(6) day!: number;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
  @IsInt() @Min(1) @Max(200) maximumPatients!: number;
}
export class BookingDto {
  @IsUUID() doctorId!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsString() @Length(3, 500) reason!: string;
  @IsOptional() @IsUUID() patientId?: string;
}
export class DateQuery {
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
}
export class PageQuery {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page: number = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 20;
}
export class SearchQuery extends PageQuery {
  @IsOptional() @IsString() @Length(0, 100) search?: string;
}
export class DirectoryQuery extends SearchQuery {
  @IsOptional() @IsIn(['active', 'archived', 'all']) state: 'active' | 'archived' | 'all' = 'active';
}
export class DoctorQuery extends DirectoryQuery {
  @IsOptional() @IsString() @Length(0, 100) search?: string;
  @IsOptional() @IsUUID() departmentId?: string;
}
export class PatientProfileDto {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string;
  @IsOptional()
  @IsIn(["Female", "Male", "Other", "Prefer not to say"])
  gender?: string;
  @IsOptional()
  @IsIn(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
  bloodGroup?: string;
  @IsOptional() @IsString() @Length(0, 500) address?: string;
  @IsOptional() @IsString() @Length(0, 100) emergencyContact?: string;
  @IsOptional() @IsString() @Length(0, 1000) allergies?: string;
}
export class MedicineDto {
  @IsString() @Length(1, 100) medicine!: string;
  @IsString() @Length(1, 100) dose!: string;
  @IsString() @Length(1, 100) frequency!: string;
  @IsString() @Length(1, 100) duration!: string;
}
export class RecordDto {
  @IsString() @Length(1, 5000) notes!: string;
  @IsString() @Length(1, 1000) diagnosis!: string;
  @IsString() @Length(0, 2000) advice!: string;
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  followUp?: string;
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MedicineDto)
  medicines!: MedicineDto[];
}
export class UsersQuery extends SearchQuery {
  @IsOptional() @IsIn(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']) role?: 'PATIENT' | 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN';
  @IsOptional() @IsIn(['true']) withoutDoctorProfile?: 'true';
}
export class AppointmentQuery extends SearchQuery {
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @IsIn(['all', 'active', 'history', 'records']) view: 'all' | 'active' | 'history' | 'records' = 'all';
  @IsOptional() @IsIn(['WAITING','CALLED','COMPLETED','CANCELLED']) status?: 'WAITING' | 'CALLED' | 'COMPLETED' | 'CANCELLED';
}
export class ArchiveDto { @IsBoolean() archived!: boolean; }
export class UpdateDoctorDto {
  @IsUUID() departmentId!: string;
  @IsString() @Length(2, 100) name!: string;
  @IsString() @Length(2, 200) qualification!: string;
  @IsString() @Length(2, 100) specialization!: string;
  @IsInt() @Min(0) @Max(70) experience!: number;
  @IsInt() @Min(0) @Max(100000) consultationFee!: number;
  @IsString() @Length(1, 30) roomNumber!: string;
}
export class SettingsDto {
  @IsString() @Length(2,100) name!: string;
  @IsString() @Length(0,500) address!: string;
  @IsString() @ValidateIf((_o,v) => v !== '') @Matches(/^\+[1-9]\d{7,14}$/) phone!: string;
  @IsString() @ValidateIf((_o,v) => v !== '') @IsEmail() @Length(0,254) email!: string;
  @IsString() @Length(1,100) timeZone!: string;
  @IsInt() @Min(1) @Max(365) bookingWindowDays!: number;
}
