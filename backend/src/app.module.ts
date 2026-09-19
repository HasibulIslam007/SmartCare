import { HospitalModule } from "./hospital/hospital.module";
import { StorageModule } from "./storage/storage.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: process.env.NODE_ENV === "test", validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    HealthModule,
    HospitalModule,
    StorageModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
