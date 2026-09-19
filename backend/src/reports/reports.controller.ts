import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../common/security";
import { PublicUser } from "../users/users.service";
import { CreateReportDto, ListReportsQueryDto } from "./reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
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
}