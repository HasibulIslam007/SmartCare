import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { CurrentUser, Roles } from "../common/security";
import { PublicUser } from "../users/users.service";
import { Role } from "../generated/prisma/enums";
import { NotificationsService } from "./notifications.service";
import { NotificationPreferencesDto } from "./notifications.dto";

@Controller("notifications")
@Roles(Role.PATIENT)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() user: PublicUser) { return this.notifications.list(user); }
  @Get("unread-count") count(@CurrentUser() user: PublicUser) { return this.notifications.unreadCount(user); }
  @Patch("read-all") readAll(@CurrentUser() user: PublicUser) { return this.notifications.markAllRead(user); }
  @Get("preferences") preferences(@CurrentUser() user: PublicUser) { return this.notifications.preferences(user); }
  @Patch("preferences") update(@Body() data: NotificationPreferencesDto, @CurrentUser() user: PublicUser) { return this.notifications.updatePreferences(user, data); }
  @Patch(":id/read") read(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: PublicUser) { return this.notifications.markRead(id, user); }
}
