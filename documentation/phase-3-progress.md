# SmartCare v0.1 — Phase 3 Progress

**Last updated:** 2026-09-19  
**Branch:** `release/v0.1`  
**Baseline commit:** `748498c`  
**Plan:** [`phase-3-plan.md`](./phase-3-plan.md)  
**Status:** Not started; Phase 2 entry gates are still open

## Status summary

Phase 3 implementation has not started. This tracker records the verified repository baseline and the work required before medical files, prescription documents, notifications, sharing, or communication can be called complete.

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

- No `MedicalReport` model, migration, report API, or report authorization tests.
- No S3-compatible storage adapter, private bucket configuration, signed URL service, or malware-scan integration.
- No prescription PDF generator or prescription-document storage workflow.
- No report-sharing model, hashed token flow, expiry/revocation API, or consent tests.
- No notification queue/worker, email provider, push provider, delivery-attempt model, or preference model.
- No communication/announcement model or message API.
- No verified Phase 2 API test, frontend typecheck/build, receptionist workflow, audit logging, or browser-test baseline.
- Backend package dependencies currently do not include an object-storage SDK, PDF library, email provider, push provider, or queue library. Dependency additions require an explicit architecture/configuration review.

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
| Storage provider decision | Planned | Use an S3-compatible private adapter; provider and credentials remain undecided |

## Phase 3 work tracker

| Area | Status | Planned evidence |
|---|---|---|
| 3.0 Prerequisite/data-contract review | Blocked by Phase 2 gates | Decision record, authorization matrix, API contracts |
| 3.1 Medical report model | Not started | Prisma schema, migration, model/service tests |
| 3.2 Secure storage/upload | Not started | Fake-provider tests, validation tests, scan/quarantine behavior |
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

- `medical_reports`: patient/uploader relations, report type, title/description, private object key, size, detected MIME, scan/status fields, and timestamps.
- `report_shares`: report/patient/recipient relations, hashed access token, expiry, revocation/status, and timestamps.
- `notifications` and delivery attempts: event type, recipient, channel, idempotency key, status, retry metadata, and timestamps.
- `notification_preferences`: per-user appointment, queue, report, email, and push controls.
- `messages` or a narrower announcements model: sender/audience, body, read state, and timestamps.
- Prescription-document relation: only after the existing structured prescription/medical-record contract is reconciled.

All schema changes require a migration, restrictive foreign-key behavior, indexes for ownership/date/status queries, and tests against fresh and existing non-production databases.

## Planned API changes

The proposed routes and response details are defined in `phase-3-plan.md`. None are implemented or available for use yet. Every route must document authentication, role, patient/doctor relationship, validation, error behavior, and audit requirements before implementation.

## Security and privacy checklist

- [ ] Private storage bucket and no public object ACLs.
- [ ] Object keys contain no direct patient identifiers.
- [ ] Upload extension, MIME, signature, size, and authorization validation.
- [ ] Malware scan/quarantine decision is implemented and tested.
- [ ] Signed URLs are short-lived and created only after authorization.
- [ ] Medical file contents and raw share tokens are excluded from logs.
- [ ] Patient ownership and doctor care-relationship checks are server-side.
- [ ] Share tokens are hashed, expiring, revocable, and audited.
- [ ] Prescription PDFs are derived from authorized structured data and stored privately.
- [ ] Notification preferences and channel failures do not expose medical details.
- [ ] Retention, deletion, backup, restore, and incident handling are documented.

## Verification log

No Phase 3 implementation commands have been run. Existing baseline evidence is recorded in:

- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-2-progress.md`
- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/architecture.md`
- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/database.md`

For each completed Phase 3 area, add the date, branch, objective, changed files, exact commands, pass/fail output, limitations, and remaining blockers here. Do not mark a feature complete from code inspection alone.

## Current blockers and next actions

1. Commit the Phase 2 plan/progress files that are currently untracked.
2. Complete and record the Phase 2 API, frontend, receptionist, authorization, audit, and deployment prerequisites.
3. Reconcile the current `MedicalRecord`/prescription source contract before designing PDF fields.
4. Approve the S3-compatible provider, object-key policy, scan approach, retention, and secret configuration.
5. Implement Phase 3.1 and run its migration/model tests before adding upload or frontend work.