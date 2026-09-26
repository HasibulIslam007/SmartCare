import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MailModule } from "../mail/mail.module";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthTokenService } from "./auth-token.service";
import { EncryptionService } from "./encryption.service";
import { MfaService } from "./mfa.service";
import { PasswordService } from "./password.service";
import { TotpService } from "./totp.service";
import { JwtAuthGuard, RolesGuard } from "./guards";
@Module({
  imports: [
    UsersModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: 900,
          algorithm: "HS256",
          issuer: "smartcare-api",
          audience: "smartcare-clients",
        },
        verifyOptions: {
          algorithms: ["HS256"],
          issuer: "smartcare-api",
          audience: "smartcare-clients",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    MfaService,
    TotpService,
    EncryptionService,
    PasswordService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
