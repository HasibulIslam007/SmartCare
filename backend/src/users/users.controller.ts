import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from "@nestjs/common";
import { IsEnum } from "class-validator";
import { Role } from "../generated/prisma/enums";
import { CurrentUser, Roles } from "../common/security";
import { PublicUser, UsersService } from "./users.service";

export class ChangeRoleDto {
  @IsEnum(Role)
  role!: Role;
}

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get("me")
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  @Patch(":id/role")
  @Roles(Role.ADMIN)
  changeRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: PublicUser,
  ) {
    if (id === actor.id)
      throw new BadRequestException(
        "Administrators cannot change their own role",
      );
    return this.users.changeRole(id, dto.role);
  }
}
