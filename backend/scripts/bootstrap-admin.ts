import 'reflect-metadata';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role } from '../src/generated/prisma/enums';

// Promote a registered account locally; never accept a privileged signup over HTTP.
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || !process.env.DATABASE_URL) throw new Error('Set ADMIN_EMAIL and DATABASE_URL');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }) });
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7319001)`;
      if (await tx.user.count({ where: { role: Role.ADMIN } })) return 'An administrator already exists. Use the authenticated role API.';
      const user = await tx.user.findUnique({ where: { email } });
      if (!user) return 'Register the intended administrator account first.';
      await tx.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
      return null;
    });
    if (result) { console.error(result); process.exitCode = 1; }
    else console.log('First administrator provisioned.');
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error('Administrator setup failed. Check ADMIN_EMAIL and database configuration.'); process.exitCode = 1; });
