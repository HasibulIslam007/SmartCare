import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, Public, Roles } from "../common/security";
import { Role } from "../generated/prisma/enums";
import { PublicUser } from "../users/users.service";
import {
  AuthTokenDto,
  ForgotPasswordDto,
  LoginDto,
  MfaChallengeDto,
  MfaCodeDto,
  MfaFactorDto,
  RegisterDto,
  ResetPasswordDto,
} from "./auth.dto";
import { AuthService } from "./auth.service";
import { MfaService } from "./mfa.service";

const STAFF = [Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN] as const;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly mfa: MfaService,
  ) {}

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Second step of a password sign-in when two-factor is enabled. */
  @Public()
  @Post("mfa/challenge")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  mfaChallenge(@Body() dto: MfaChallengeDto) {
    return this.auth.completeMfaChallenge(dto.challengeToken, dto.code);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Body() dto: AuthTokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @Post("verify-email/resend")
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  resendVerification(@CurrentUser() user: PublicUser) {
    return this.auth.resendVerification(user);
  }

  @Get("mfa")
  @Roles(...STAFF)
  mfaStatus(@CurrentUser() user: PublicUser) {
    return this.mfa.status(user.id);
  }

  @Post("mfa/enroll")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Roles(...STAFF)
  mfaEnroll(@CurrentUser() user: PublicUser) {
    return this.mfa.beginEnrollment(user.id, user.email);
  }

  @Post("mfa/activate")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(...STAFF)
  mfaActivate(@CurrentUser() user: PublicUser, @Body() dto: MfaCodeDto) {
    return this.mfa.activate(user.id, dto.code);
  }

  @Post("mfa/disable")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Roles(...STAFF)
  mfaDisable(@CurrentUser() user: PublicUser, @Body() dto: MfaFactorDto) {
    return this.mfa.disable(user.id, dto.code);
  }
}
