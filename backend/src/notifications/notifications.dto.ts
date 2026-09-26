import { IsBoolean, IsOptional } from "class-validator";

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  appointmentAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  queueAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  reportAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  prescriptionAlert?: boolean;
}
