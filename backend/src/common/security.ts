import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { Request } from "express";
import { Role } from "../generated/prisma/enums";
import { PublicUser } from "../users/users.service";

export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
export interface AuthenticatedRequest extends Request {
  user: PublicUser;
}
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
