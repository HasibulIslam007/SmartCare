import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, Public, Roles } from "../common/security";
import { PublicUser } from "../users/users.service";
import { Role } from "../generated/prisma/enums";
import { CreateReportDto, CreateReportShareDto, ListReportsQueryDto, ReportStatusDto, SharedReportQueryDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @Roles(Role.DOCTOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  create(
    @CurrentUser() user: PublicUser,
    @Body() dto: CreateReportDto,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
  ) {
    if (!file) throw new BadRequestException("A report file is required");
    return this.reports.create(user, dto.patientId, dto, { file: file.buffer, filename: file.originalname, mimeType: file.mimetype });
  }

  @Get()
  list(@CurrentUser() user: PublicUser, @Query() query: ListReportsQueryDto) {
    return this.reports.list(user, query);
  }

  @Get(":id/download")
  download(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.reports.download(user, id);
  }

  @Get(":id/content")
  async content(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string) {
    const file = await this.reports.content(user, id);
    return new StreamableFile(file.buffer, { type: file.mimeType, disposition: `inline; filename="${file.fileName.replace(/["\r\n]/g, "_")}"` });
  }

  @Patch(":id/status")
  @Roles(Role.DOCTOR, Role.ADMIN)
  setStatus(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ReportStatusDto) {
    return this.reports.setStatus(user, id, dto.status);
  }

  @Post(":id/shares")
  @Roles(Role.PATIENT)
  createShare(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CreateReportShareDto) {
    return this.reports.createShare(user, id, dto);
  }

  @Get(":id/shares")
  @Roles(Role.PATIENT)
  shares(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.reports.listShares(user, id);
  }

  @Patch(":id/shares/:shareId/revoke")
  @Roles(Role.PATIENT)
  revokeShare(@CurrentUser() user: PublicUser, @Param("id", ParseUUIDPipe) id: string, @Param("shareId", ParseUUIDPipe) shareId: string) {
    return this.reports.revokeShare(user, id, shareId);
  }

  @Public()
  @Get("shared/:token")
  async shared(@Param("token") token: string, @Query() query: SharedReportQueryDto) {
    const file = await this.reports.sharedContent(token, query.passcode);
    return new StreamableFile(file.buffer, { type: file.mimeType, disposition: `inline; filename="${file.fileName.replace(/["\r\n]/g, "_")}"` });
  }
}
