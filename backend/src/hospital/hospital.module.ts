import { Module } from "@nestjs/common";
import { HospitalController } from "./hospital.controller";
import { HospitalService } from "./hospital.service";
import { UsersModule } from '../users/users.module';
import { PasswordService } from '../auth/password.service';
import { SettingsService } from './settings.service';
import { PrescriptionService } from './prescription.service';
import { StorageModule } from '../storage/storage.module';
@Module({ imports: [UsersModule, StorageModule], controllers: [HospitalController], providers: [HospitalService, SettingsService, PasswordService, PrescriptionService] })
export class HospitalModule {}
