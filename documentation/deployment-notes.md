# SmartCare v0.1 Deployment Notes

## Current environment

| Component | Current state |
|---|---|
| Frontend | Next.js 16 web app in `frontend/`; local dev at `http://127.0.0.1:3000` |
| Backend | NestJS 11 API in `backend/`; local dev at `http://127.0.0.1:3001/api/v1` |
| Database | PostgreSQL 16 with Prisma 7; local cluster at port 55432 or Compose PostgreSQL at port 5432 |
| Storage | None implemented; S3-compatible medical-file storage is planned |
| Hosting | None selected; no public deployment has been performed |
| Mobile | No Flutter application delivered |

## Required environment variables

Backend (`backend/.env.example`):

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET` — random secret of at least 32 characters; use a secrets manager in production
- `CORS_ORIGIN` — exact deployed frontend origin

Frontend (`frontend/.env.example`):

- `BACKEND_URL` — server-only backend URL; never expose as `NEXT_PUBLIC_*`
- `APP_ORIGIN` — exact browser origin used for mutation origin checks

## Local deployment procedure

1. Provide Node.js 22.12+ and PostgreSQL 16+.
2. Configure backend environment from `backend/.env.example`.
3. Run `cd backend && npm ci`.
4. Build/generate: `npm run build`.
5. Deploy migrations: `npm run db:migrate`.
6. Start API: `npm run start`.
7. Configure frontend environment and run `cd frontend && npm ci && npm run build`.
8. Start frontend with `npm run start`.
9. Run the release testing checklist using synthetic data.

## Production decisions still required

- Frontend host and CDN/reverse proxy
- Backend host/container/orchestrator
- Managed PostgreSQL provider, private networking, least-privilege account, TLS, and connection pooling
- Secrets manager and rotation policy
- TLS termination and trusted proxy configuration
- Backups, retention, encryption, restore drills, and rollback strategy
- Error monitoring, metrics, structured logs, alerting, and on-call ownership
- Object storage provider, malware scanning, access control, retention, and signed URLs for medical files
- Email/SMS/push provider if notifications are included

## Safety constraints

- Do not deploy `.env`, `.local`, demo credentials, local PostgreSQL files, or synthetic fixtures.
- Do not use local trust authentication outside the isolated development cluster.
- Do not expose the API directly without TLS and an intentional network policy.
- Do not use real patient data until the security, privacy, backup, audit, and clinical review gates pass.
- Do not advertise a public URL until smoke tests, access-control tests, and rollback procedures pass.

## Current release recommendation

The deployment status is **blocked**. The code is suitable for continued local synthetic-data verification, not an external clinical pilot. Complete the production blockers in `release-audit.md`, then replace this document’s unknown hosting entries with the approved architecture and runbook.