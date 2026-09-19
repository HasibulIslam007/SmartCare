# SmartCare v0.1 — Phase 3 Progress

**Last updated:** 2026-09-19  
**Branch:** `release/v0.1`  
**Baseline commit:** `748498c`  
**Plan:** [`phase-3-plan.md`](./phase-3-plan.md)  
**Status:** Phase 3.1 database model, Phase 3.2 storage foundation, and Phase 3.3 report API foundation implemented; Phase 2 entry gates remain open

## Status summary

Phase 3.1 database and Phase 3.2 storage-foundation implementations are complete. This tracker records the verified repository baseline and the work required before medical files, prescription documents, notifications, sharing, or communication can be called complete.

The current repository has a `MedicalRecord` Prisma model with structured notes, diagnosis, advice, follow-up, and medicine JSON. It does not yet have the Phase 3 report, private-storage, share, notification, preference, message, or prescription-PDF implementations.

## Baseline inventory

### Existing foundations

- PostgreSQL and Prisma migrations are the database source of truth.
- API routes use the `/api/v1` global prefix.
- NestJS uses strict DTO validation, JWT/role guards, an HTTP response envelope, Helmet, and throttling foundations.
- Existing `MedicalRecord` data is structured in PostgreSQL; future binary documents must remain outside PostgreSQL.
- Frontend already contains a records page, but its behavior and API integration must be traced before adding a report portal.
- `AGENTS.md` specifies AWS S3-compatible storage for medical reports, images, documents, and prescriptions.

### Not present or not verified

- No report API or report authorization tests yet; the `MedicalReport` model and migration are now present.
- Storage abstraction now has local and S3-compatible providers, private-key generation, signed URL support, configurable validation, and a development scanner boundary; production malware scanning and provider configuration remain deployment concerns.
- No prescription PDF generator or prescription-document storage workflow.
- No report-sharing model, hashed token flow, expiry/revocation API, or consent tests.
- No notification queue/worker, email provider, push provider, delivery-attempt model, or preference model.
- No communication/announcement model or message API.
- No verified Phase 2 API test, frontend typecheck/build, receptionist workflow, audit logging, or browser-test baseline.
- Backend package dependencies now include the reviewed S3 SDK for Phase 3.2; PDF, email, push, and queue dependencies remain absent. Further dependency additions require an explicit architecture/configuration review.

## Phase 2 entry-gate status

| Gate | Status | Evidence / next action |
|---|---|---|
| Backend build | Complete for the DTO fix | `cd /Users/tohid/Documents/Hospital/SmartCare-HMS/backend && npm run build` passed per Phase 2 tracker |
| Backend unit tests | Complete for the DTO fix | `cd /Users/tohid/Documents/Hospital/SmartCare-HMS/backend && npm test`; 5 suites, 11 tests passed per Phase 2 tracker |
| Backend API tests | Not verified | Run `npm run test:api` and record the result in Phase 2 tracker |
| Frontend typecheck | Not verified | Run `npm run typecheck` from `/Users/tohid/Documents/Hospital/SmartCare-HMS/frontend` |
| Frontend production build | Not verified | Run `npm run build` from `/Users/tohid/Documents/Hospital/SmartCare-HMS/frontend` |
| Receptionist workflow | Incomplete | Finish registration/search/walk-in verification before Phase 3 implementation |
| Authorization review | Incomplete | Complete ownership and role review, especially medical-history access |
| Audit logging | Not implemented | Phase 2 work must establish the event/audit foundation used by Phase 3 |
| Consultation/prescription source contract | Reconciliation required | Current source tree/schema and Phase 2 plan use different module terminology; resolve before PDF work |
| Storage provider decision | Defined | S3-compatible private adapter with local development provider; provider credentials and deployment endpoint remain environment-specific |

## Phase 3 work tracker

| Area | Status | Planned evidence |
|---|---|---|
| 3.0 Prerequisite/data-contract review | Blocked by Phase 2 gates | Decision record, authorization matrix, API contracts |
| 3.1 Medical report model | Complete | Prisma migration, validation/generation, backend build/unit tests, and local migration status |
| 3.2 Secure storage/upload | Complete | Local/S3 adapter, 10 MB and signature validation, scanner boundary, and storage unit tests |
| 3.3 Patient report portal | Not started | API tests, frontend typecheck/build, patient ownership tests |
| 3.4 Doctor/staff access | Not started | Care-relationship authorization tests |
| 3.5 Prescription PDF | Not started | PDF fixture/content test, private-storage test, download authorization |
| 3.6 Consent-based sharing | Not started | Create/access/expiry/revoke tests and audit evidence |
| 3.7 Notification engine | Not started | Idempotency, preference, retry, and worker/provider tests |
| 3.8 Notification preferences | Not started | DTO/API tests and channel suppression tests |
| 3.9 Communication foundation | Not started | Audience, ownership, read-state, and authorization tests |
| 3.10 Release verification | Not started | Full command log, migration check, browser tests, updated docs |

## Planned database changes

These are design targets, not applied migrations:

- `medical_reports`: implemented in migration `202609200001_medical_reports`; patient/uploader relations, report type, title/description, private object key, size, MIME, status, indexes, and timestamps. Malware scan/quarantine fields remain a later storage/API concern.
- `report_shares`: report/patient/recipient relations, hashed access token, expiry, revocation/status, and timestamps.
- `notifications` and delivery attempts: event type, recipient, channel, idempotency key, status, retry metadata, and timestamps.
- `notification_preferences`: per-user appointment, queue, report, email, and push controls.
- `messages` or a narrower announcements model: sender/audience, body, read state, and timestamps.
- Prescription-document relation: only after the existing structured prescription/medical-record contract is reconciled.

All schema changes require a migration, restrictive foreign-key behavior, indexes for ownership/date/status queries, and tests against fresh and existing non-production databases.

## Planned API changes

The proposed routes and response details are defined in `phase-3-plan.md`. None are implemented or available for use yet. Every route must document authentication, role, patient/doctor relationship, validation, error behavior, and audit requirements before implementation.

## Security and privacy checklist

- [x] Private storage bucket and no public object ACLs are required by the S3 adapter/configuration contract.
- [x] Generated object keys contain no direct patient identifiers.
- [x] Upload extension, MIME, signature, and 10 MB size validation is implemented and tested.
- [x] `MAX_UPLOAD_SIZE` and `ALLOWED_FILE_TYPES` are validated at application startup and injected into storage validation.
- [ ] Production malware scan/quarantine integration is implemented; the current development scanner is an explicit pass-through boundary.
- [ ] Report-service ownership checks are implemented; raw storage operations intentionally accept only opaque keys and are not API endpoints.
- [ ] Signed URLs are short-lived and created only after authorization.
- [ ] Medical file contents and raw share tokens are excluded from logs.
- [ ] Patient ownership and doctor care-relationship checks are server-side.
- [ ] Share tokens are hashed, expiring, revocable, and audited.
- [ ] Prescription PDFs are derived from authorized structured data and stored privately.
- [ ] Notification preferences and channel failures do not expose medical details.
- [ ] Retention, deletion, backup, restore, and incident handling are documented.

## Verification log

### 2026-09-19 — Phase 3.1 database model

- Branch: `release/v0.1` (local branch is one commit ahead of `origin/release/v0.1`).
- Changed files: `database/schema.prisma`, `database/migrations/202609200001_medical_reports/migration.sql`, `documentation/database.md`, and this progress file.
- The model uses the existing `User` entity for both patient and uploader relations, UUID/timestamptz conventions, restrictive foreign keys, and patient/status/date plus uploader/date indexes.
- Verification: `cd /Users/tohid/Documents/Hospital/SmartCare-HMS/backend && npx prisma validate --schema=../database/schema.prisma` passed; `npx prisma generate --schema=../database/schema.prisma` passed; `npm run build` passed; `npm test` passed with 5 suites and 11 tests; `npx prisma migrate deploy --schema=../database/schema.prisma` applied the pending local migrations; and `npx prisma migrate status --schema=../database/schema.prisma` reports the database schema is up to date.
- Limitation: no report API, storage adapter, malware scan/quarantine flow, authorization tests, frontend portal, or audit events are included in this database-only slice.

### 2026-09-19 — Phase 3.2 storage foundation

- Changed files: `backend/src/storage/`, `backend/src/app.module.ts`, `backend/src/config/environment.ts`, `backend/.env.example`, `backend/package.json`, `backend/package-lock.json`, and this progress file.
- Implemented an injectable storage abstraction with local development storage and an AWS S3-compatible provider using private objects, AES-256 server-side encryption, and five-minute signed download URLs.
- Implemented generated UUID-based keys, PDF/JPEG/PNG extension/MIME/signature checks, empty-file rejection, and a 10 MB maximum. Added a `VirusScanner` boundary with a development pass-through implementation; production scanning remains required before clinical use.
- Added startup validation and dependency injection for `MAX_UPLOAD_SIZE` and `ALLOWED_FILE_TYPES`. Added `StorageAuditMetadata` for the future report/audit service (`fileKey`, uploader, upload time, size, MIME type, and provider).
- Storage never returns raw bucket paths: S3 access is temporary signed URL generation, while local access uses a non-HTTP development scheme. Ownership checks remain in Phase 3.3 because storage has no report or authenticated-user context.
- Verification: `cd /Users/tohid/Documents/Hospital/SmartCare-HMS/backend && npm run build` and `npm test` passed after implementation. Storage tests cover upload/key generation, provider delegation, invalid files, size rejection, and scanner rejection.
- Limitation: no report API, HTTP multipart limit, ownership authorization, audit event persistence, production scanner, retention policy, or deployment-specific bucket policy is included in this slice.

### 2026-09-19 — Phase 3.3 medical report API foundation

- Changed files: `backend/src/reports/`, `backend/src/app.module.ts`, and this progress file.
- Implemented authenticated `POST /api/v1/reports` multipart upload, `GET /api/v1/reports` listing with type/status/pagination filters, and `GET /api/v1/reports/:id/download` temporary URL access.
- Uploads enforce the existing 10 MB multipart limit and the storage validation/scanner boundary. Filenames are reduced to a basename; generated storage keys remain provider-owned. Database rows contain metadata only and report responses never include `fileKey`.
- Authorization: patients can access only their own reports; doctors can access patients connected through `CALLED` or `COMPLETED` appointments; administrators have system access; receptionists are denied. Doctor access intentionally uses the existing appointment relationship because no separate consultation model exists.
- Added `REPORT_UPLOADED`, `REPORT_VIEWED`, and `REPORT_DOWNLOADED` event contracts with an injectable no-op sink. Persistence is intentionally deferred until the audit schema is approved.
- Verification: `npm run typecheck`, `npm run build`, and report service unit tests pass. Full API tests still require `TEST_DATABASE_URL` and should be run against an isolated database.
- Limitations: production malware quarantine, retention/deletion policy, persisted audit events, and a doctor-specific consultation/assignment model remain outside this slice. Upload is restricted to administrators and doctors with an existing completed/in-progress appointment relationship; patient self-upload is not enabled.

Existing baseline evidence is recorded in:

- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-2-progress.md`
- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/architecture.md`
- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/database.md`

For each completed Phase 3 area, add the date, branch, objective, changed files, exact commands, pass/fail output, limitations, and remaining blockers here. Do not mark a feature complete from code inspection alone.

## Current blockers and next actions

1. Commit the Phase 2 plan/progress files that are currently untracked.
2. Complete and record the Phase 2 API, frontend, receptionist, authorization, audit, and deployment prerequisites.
3. Reconcile the current `MedicalRecord`/prescription source contract before designing PDF fields.
4. Approve the S3-compatible provider, object-key policy, scan approach, retention, and secret configuration.
5. Resolve the Phase 3.2 production scanner, retention, and deployment configuration decisions before implementing report APIs.