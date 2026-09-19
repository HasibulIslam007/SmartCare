import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "../generated/prisma/client";
import { Role } from "../generated/prisma/enums";

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }
  async createPatient(data: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
  }) {
    try {
      return await this.prisma.user.create({
        data: { ...data, role: Role.PATIENT },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An account with these details already exists",
        );
      }
      throw error;
    }
  }
  async changeRole(id: string, role: Role) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { role },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      )
        throw new NotFoundException("User not found");
      throw error;
    }
  }
}
