import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
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

export class ListReportsQueryDto {
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