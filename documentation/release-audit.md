# SmartCare v0.1 Release Audit

**Audit date:** 2026-09-19  
**Branch:** `release/v0.1`  
**Audit scope:** Current repository state, including the pre-existing uncommitted changes present when the branch was created. No application code was modified for this audit.

## Executive summary

SmartCare is a local development milestone with a working NestJS/Prisma/PostgreSQL API and a Next.js web application. The core pilot workflows are represented: patient authentication, doctor discovery, schedules, appointment booking and serial generation, queue transitions, patient profiles, consultations/prescriptions, and administrative catalog/user operations.

It is **not production-ready**. There is no public deployment, no production hosting decision, no external file storage, no notification delivery, and no mobile or AI client. Clinical use is blocked by missing operational/security controls and by incomplete catalog, staff-registration, report-storage, notification, and recovery workflows.

The repository contains uncommitted changes on the source `main` branch at the time of this audit. The release branch preserves that exact working tree; those changes must be reviewed and committed separately before treating the branch as a reproducible release baseline.

## Repository and guidance baseline

- `AGENTS.md` exists and specifies NestJS, Next.js, PostgreSQL/Prisma, JWT, role-based permissions, testing, and security expectations.
- The requested root-level `requirements.md` does not exist. The project equivalent is `documentation/requirements.md`.
- `documentation/verification.md` exists and records the latest reported verification checkpoint.
- Existing product documentation is present under `documentation/`.
- No `documentation/` release audit set existed before this audit.

## Backend modules

| Area | Finding | Status |
|---|---|---|
| Application bootstrap/configuration | NestJS app, global validation, response/error setup, CORS/security middleware, throttling, and loopback binding are present. | Implemented; production configuration still required |
| Authentication | Patient registration, login, Argon2id password hashing, 15-minute JWT access tokens, logout through the web cookie, and current-user lookup. | Implemented |
| Authorization | Global JWT and role guards with live database role lookup. Roles: PATIENT, DOCTOR, RECEPTIONIST, ADMIN. | Implemented and API-tested |
| Users/admin | Current-user profile, admin role assignment, admin user search/analytics, bootstrap-admin script. | Implemented; lifecycle controls incomplete |
| Hospital catalog | Departments, doctors, schedules, availability, admin update/archive flows in current working tree. | Implemented/under review |
| Appointments | Booking, 90-day window, capacity checks, duplicate checks, serial generation, cancellation, ownership rules. | Implemented and API-tested |
| Queue | Next/called/completed transitions and queue summaries. | Implemented and API-tested |
| Patient records | Patient profile, consultation record, medicines/prescription data, history access rules. | Partial: browser print/save is not a dedicated server PDF |
| Health/database | Health route and Prisma PostgreSQL access. | Implemented |
| Settings | Hospital settings service/model changes are present in the uncommitted working tree. | Needs review and migration/test verification |

## Frontend pages and client behavior

Next.js pages/components were found for:

- Landing/dashboard: `frontend/app/page.tsx`
- Registration and login
- Doctor directory and doctor profile/availability
- Appointments
- Live queue polling
- Patient profile
- Medical records
- Staff workspace
- Administration
- Same-origin API proxy with route allowlist, HttpOnly SameSite cookie, origin checking, request-size limit, and upstream timeout

The frontend uses React Query, Zustand, Tailwind, and Radix/shadcn-style components. No frontend unit, integration, browser automation, or accessibility test files were found. The verification document reports manual desktop/390px checks, but those checks are not reproducible automated tests.

## Database schema and migrations

PostgreSQL 16 and Prisma 7 are configured. The schema contains users/roles, patient profiles, departments, doctors, schedules, appointments/statuses, medical records, and hospital settings. Migrations exist for foundation, hospital, and current core workflows.

Positive controls include UUID identifiers, unique normalized identity fields at the application/database boundary, appointment serial uniqueness, indexes for common lists, restrictive deletes for clinical records, and no sensitive medical data in JWT claims.

The current working tree modifies `database/schema.prisma` and adds a migration directory. These changes are not yet committed and require migration deployment plus regression testing before release tagging. Planned but absent entities include reports/files, notifications, audit events, revocable sessions, and configurable operational integrations.

## API endpoint inventory

The documented `/api/v1` surface includes:

- Public auth: register, login; public health, departments, doctors, availability
- Signed-in users: current user, appointments, queue, patient profile/history as authorized
- Admin: role changes, departments/doctors/settings, users, analytics
- Staff workflows: patient lookup/registration support as implemented, appointment creation, queue actions, doctor schedules
- Clinical workflow: treating-doctor record creation and authorized history access

The frontend proxy has an explicit endpoint allowlist rather than arbitrary upstream forwarding. `documentation/api.md` is the detailed reference and should be updated whenever the current uncommitted endpoint changes are finalized.

## Authentication and permissions audit

### Verified from code/documentation

- Passwords are hashed with Argon2id; plaintext passwords are not stored.
- JWT expiry is 900 seconds and tokens contain the user subject rather than clinical data.
- Public registration always creates a PATIENT; clients cannot self-select a privileged role.
- Guards verify bearer token format/signature, UUID subject, current account existence, and route roles.
- The API tests cover invalid/expired tokens, role authorization, demotion, ownership, history access, and concurrent booking.
- The browser stores the token in an HttpOnly, SameSite=Strict cookie and uses Secure in production.

### Gaps requiring pre-launch decision or remediation

- Logout does not revoke an already-stolen bearer token; centralized session revocation is absent.
- Staff MFA, email/phone verification, password recovery, and account lockout are absent.
- Rate limiting is process-local and is not backed by shared storage for multiple instances.
- Persistent audit trails for privileged and clinical actions are absent.
- Production backup encryption, restore drills, monitoring, alerting, and incident response are not configured.
- A doctor-to-doctor data-isolation test should be retained as a release acceptance test, even though current API tests cover history access rules.
- Production TLS/reverse-proxy/trusted-proxy configuration is not provided.

## Existing tests and verification

Found:

- Backend unit/spec suites for auth, password, environment, hospital, and users.
- Backend real-PostgreSQL API suites for auth and hospital workflows.
- `documentation/verification.md` reports 5 unit suites/11 tests and 2 API suites/24 tests passed at its checkpoint.
- The same checkpoint reports backend build, frontend build/typecheck, manual layout checks, registration, and booking checks passed.

Not found:

- Frontend automated tests
- Automated accessibility suite
- Load/stress test suite
- Production deployment smoke test
- Backup/restore verification in CI

The checkpoint is historical and must be rerun against this branch’s current uncommitted schema/service changes.

## Potential bugs and incomplete behavior

1. Current release work is uncommitted, so a clean checkout cannot reproduce the audited behavior.
2. Current development documentation says the API binds to loopback; this is unsuitable for a separated production frontend without deliberate reverse-proxy/network configuration.
3. Department/doctor archival and editing changes are in the working tree and need migration, authorization, and UI regression checks.
4. Receptionist registration is partial; staff can book existing patients, but the requested end-to-end registration workflow is not complete.
5. Notifications are not delivered; queue updates are polling only.
6. Medical reports/files and protected downloads are absent.
7. Prescription output is browser print/save rather than a dedicated server-generated PDF.
8. List endpoints have development caps/pagination limits and have not received load testing.
9. Error monitoring and operational dashboards are absent.

## Production blockers

- No hosting/provider architecture or production environment is configured.
- No managed production database, migration runbook, backup/restore process, or secrets-management plan is documented.
- Missing staff MFA, recovery, verification, session revocation, audit logs, and clinical/security review.
- Missing secure report storage, malware scanning, protected download links, and retention policy.
- Missing notifications if the pilot promises patient reminders or push/email/SMS.
- No repeatable frontend/browser/accessibility/load test gate.
- No public deployment has been performed; local demo credentials/data must not be promoted.

## Recommended fix order

1. Review and commit the current backend/schema/migration changes; rerun migrations, builds, unit tests, and API tests on an isolated database.
2. Decide and document the pilot hosting topology, TLS, secrets, database, backups, monitoring, and rollback plan.
3. Add staff MFA, recovery/verification, session revocation, audit logging, and distributed rate limiting or explicitly exclude clinical/staff pilot use.
4. Finish and test catalog edit/archive and receptionist patient-registration flows.
5. Add automated frontend smoke/accessibility coverage and a small concurrent booking/load gate.
6. Decide whether reports, notifications, and dedicated prescription PDFs are in v0.1; otherwise clearly exclude them from pilot claims.

## Audit conclusion

Core local workflows are sufficiently defined for a controlled synthetic-data pilot review, but the application should not be marketed as a production clinical platform or deployed with real patient data until the blockers above are resolved and the release acceptance checklist passes.