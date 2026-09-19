import { UsersService } from "./users.service";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "../generated/prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Role } from "../generated/prisma/enums";
describe("UsersService database errors", () => {
  const create = jest.fn();
  const update = jest.fn();
  const service = new UsersService({
    user: { create, update },
  } as unknown as PrismaService);
  it("maps unique constraint races to conflict", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "7",
      }),
    );
    await expect(
      service.createPatient({
        name: "Test",
        email: "test@example.com",
        phone: "+8801712345678",
        passwordHash: "hashed",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it("maps a missing role target to not found", async () => {
    update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("missing", {
        code: "P2025",
        clientVersion: "7",
      }),
    );
    await expect(
      service.changeRole("missing", Role.DOCTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
