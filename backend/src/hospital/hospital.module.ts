import { Module } from "@nestjs/common";
import { HospitalController } from "./hospital.controller";
import { HospitalService } from "./hospital.service";
import { UsersModule } from '../users/users.module';
import { PasswordService } from '../auth/password.service';
import { SettingsService } from './settings.service';
@Module({ imports: [UsersModule], controllers: [HospitalController], providers: [HospitalService, SettingsService, PasswordService] })
export class HospitalModule {}
