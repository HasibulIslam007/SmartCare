import { randomBytes } from 'node:crypto';
if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL test database');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'http://127.0.0.1:3000';
