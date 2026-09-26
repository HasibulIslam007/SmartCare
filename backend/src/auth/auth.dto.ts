import { Transform } from "class-transformer";
import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(12, 128)
  password!: string;
}

export class RegisterDto extends LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: "phone must use international format, for example +8801712345678",
  })
  phone!: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

// 32 random bytes encoded as base64url.
const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;

export class AuthTokenDto {
  @IsString()
  @Matches(TOKEN, { message: "token is not a valid link token" })
  token!: string;
}

export class ResetPasswordDto extends AuthTokenDto {
  @IsString()
  @Length(12, 128)
  password!: string;
}

/** Six-digit authenticator code. */
export class MfaCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: "code must be the 6-digit authenticator code" })
  code!: string;
}

export class MfaFactorDto {
  @IsString()
  @Matches(/^(\d{6}|[0-9a-f]{10})$/, {
    message: "code must be a 6-digit authenticator code or a recovery code",
  })
  code!: string;
}

export class MfaChallengeDto extends MfaFactorDto {
  @IsString()
  @Length(20, 4096)
  challengeToken!: string;
}
