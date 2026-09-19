# Deployment and operational limits

No public deployment has been performed.

## Environment

Backend: `DATABASE_URL`, random `JWT_SECRET` (32+ characters), `PORT` (3001), `CORS_ORIGIN`, `NODE_ENV`.
Frontend: server-only `BACKEND_URL` and exact `APP_ORIGIN`. Do not prefix the backend URL or tokens with `NEXT_PUBLIC_`.

Use Node 22.12+ consistently. Prisma 7 requires the PostgreSQL driver adapter. Build and generate the client before starting `dist/src/main.js`. Deploy migrations before allowing traffic.

The API currently binds to loopback, suitable for local development or a same-host reverse proxy. Container deployment needs explicit listen-address configuration, TLS termination and network restrictions. The frontend production command sets Secure cookies; production access must use HTTPS.

On this development machine, Next.js Turbopack worker startup was restricted. `npm run build -- --webpack` completes successfully; Webpack is supported as a build fallback. macOS may hydrate source files in Documents from cloud storage, causing initially slow reads.

The local PostgreSQL cluster is bound to 127.0.0.1:55432 and uses trust authentication only for synthetic local data. Production databases need dedicated least-privilege accounts and password/certificate authentication. Never deploy `.local`, `.env`, test fixtures or demo credentials.

The current Nest throttler is per-process and the web proxy presents a shared upstream IP. Configure a trusted proxy chain plus shared rate-limit storage for multi-user production use; do not blindly trust forwarded IP headers. Public signups have no identity verification yet.

Required production work includes audit logs, staff MFA, account recovery, session revocation, secure report storage/scanning, backups and restore drills, error monitoring, and load/accessibility testing. No compliance certification is claimed.
