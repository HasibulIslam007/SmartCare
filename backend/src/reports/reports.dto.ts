import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { ReportStatus, ReportType } from "../generated/prisma/enums";

export class CreateReportDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(ReportType)
  reportType!: ReportType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ReportStatusDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

export class CreateReportShareDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays: number = 7;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxDownloads?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4,12}$/, { message: "passcode must contain 4 to 12 digits" })
  passcode?: string;
}

export class SharedReportQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  passcode?: string;
}

export class ListReportsQueryDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}
