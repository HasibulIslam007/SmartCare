import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SettingsDto } from './hospital.dto';

export function hospitalToday(timeZone = 'Asia/Dhaka', at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}
export function validTimeZone(timeZone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone }).format(); return true; } catch { return false; }
}
@Injectable()
export class SettingsService {
  constructor(private readonly db: PrismaService) {}
  get() { return this.db.hospitalSettings.findUniqueOrThrow({ where: { id: 'main' } }); }
  async update(dto: SettingsDto) {
    if (!validTimeZone(dto.timeZone)) throw new BadRequestException('Choose a valid IANA timezone, such as Asia/Dhaka');
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM hospital_settings WHERE id = 'main' FOR UPDATE`;
      const current = await tx.hospitalSettings.findUniqueOrThrow({ where: { id: 'main' } });
      if (current.timeZone !== dto.timeZone && await tx.appointment.count({ where: { status: { in: ['WAITING', 'CALLED'] } } })) {
        throw new ConflictException('Complete or cancel all waiting and called visits before changing the hospital timezone');
      }
      return tx.hospitalSettings.update({ where: { id: 'main' }, data: dto });
    });
  }
}
