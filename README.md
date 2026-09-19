# SmartCare Hospital Management System

A hospital web application with a Next.js patient portal and staff workspace, backed by NestJS, Prisma and PostgreSQL.

## Current implementation

- Patient registration and login; Argon2id password hashing and 15-minute JWTs.
- Patient, doctor, receptionist and administrator permissions enforced by the API.
- Searchable doctor directory, departments, weekly schedules and availability.
- Appointment booking, capacity checks, unique serials, cancellation and queue management.
- Live queue polling, patient profiles, consultation records and prescriptions.
- Doctor workspace and administration for roles, departments and doctor profiles.

**This is a local development milestone, not the complete production platform.** File reports/S3, push/email/SMS, Flutter, CareBot, dedicated prescription PDF generation, and production operational controls remain. See [requirements status](documentation/requirements.md).

## Start locally

Requires Node.js 22.12+ and PostgreSQL 16+. Use `node --version` to check the actual runtime selected by your shell.

### Database

This workspace has an isolated PostgreSQL cluster in `.local/postgres`, using port **55432**. If stopped, run from the project root:

```sh
pg_ctl -D .local/postgres -l .local/postgres.log -o '-h 127.0.0.1 -p 55432 -k /private/tmp' start
```

It uses local trust authentication for development only. Do not expose this cluster to a network.

For a fresh installation, use your own PostgreSQL instance, or set `POSTGRES_PASSWORD` in your shell and run `docker compose up -d`. The Compose database uses port 5432 and password authentication.

### Backend

```sh
cd backend
npm ci
# Fresh installs only: copy .env.example to .env, set DATABASE_URL,
# and generate JWT_SECRET with: openssl rand -hex 32
npm run build
npm run db:migrate
npm run start
```

The API listens on `http://127.0.0.1:3001/api/v1`. The existing local `.env` is already configured and is gitignored.

### Website (another terminal)

```sh
cd frontend
npm ci
# Fresh installs: copy .env.example to .env.local
npm run dev
```

Open **http://127.0.0.1:3000**. The `APP_ORIGIN` setting must exactly match the browser origin for form submissions. Another project on this machine can answer `localhost:3000` over IPv6, so use the explicit IPv4 address for SmartCare.

### Fictional demo directory and staff

```sh
cd backend
SEED_DEMO=true npm run db:seed
```

The seed creates six fictional doctor profiles with visiting hours and generated staff credentials. New credentials are saved locally in `.local/demo-accounts.md` with restricted file permissions. No fixed passwords are committed. The script refuses production mode. Register a patient through the website to test booking.

For a real first administrator: register the intended user, then run `ADMIN_EMAIL=your-address@example.com npm run bootstrap:admin`. The command only works when no administrator exists.

## Verify

```sh
cd backend
npm run build
npm test
DATABASE_URL=postgresql://smartcare@127.0.0.1:55432/smartcare_test npm run db:migrate
TEST_DATABASE_URL=postgresql://smartcare@127.0.0.1:55432/smartcare_test npm run test:api
cd ../frontend
npm run build
npm run typecheck
```

API tests require an isolated test database and clean up their own fixtures. They exercise real PostgreSQL, including simultaneous bookings and access control.

## Documentation

- [Requirements and remaining milestones](documentation/requirements.md)
- [Architecture](documentation/architecture.md)
- [Database design](documentation/database.md)
- [API reference](documentation/api.md)
- [Deployment and operational limits](documentation/deployment.md)
- [User guide](documentation/user-guide.md)
