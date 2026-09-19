import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Public } from "../common/security";
import { PrismaService } from "../database/prisma.service";

@Controller("health")
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
    return { status: "ok", database: "connected" };
  }
}
@Module({ controllers: [HealthController] })
export class HealthModule {}
