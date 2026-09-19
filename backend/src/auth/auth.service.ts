import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PublicUser, UsersService } from "../users/users.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { PasswordService } from "./password.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    const user = await this.users.createPatient({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: await this.passwords.hash(dto.password),
    });
    return this.session(user);
  }
  async login(dto: LoginDto) {
    const record = await this.users.findByEmail(dto.email);
    const valid = await this.passwords.verify(
      record?.passwordHash,
      dto.password,
    );
    if (!record || !valid)
      throw new UnauthorizedException("Invalid email or password");
    const user: PublicUser = {
      id: record.id,
      name: record.name,
      email: record.email,
      phone: record.phone,
      role: record.role,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return this.session(user);
  }
  private async session(user: PublicUser) {
    return {
      user,
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      tokenType: "Bearer",
      expiresIn: 900,
    };
  }
}
