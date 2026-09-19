# SmartCare v0.1 — Phase 3 Execution Plan

**Status:** Planned; gated by Phase 2 completion  
**Scope:** Medical files, reports, prescription documents, notifications, sharing, and communication foundations  
**Baseline:** `release/v0.1`  
**Repository:** `/Users/tohid/Documents/Hospital/SmartCare-HMS`  
**Estimated duration:** 4–6 weeks after Phase 2 release blockers are closed

## Mission

Add a secure medical-document and communication foundation without weakening the existing authentication, appointment, queue, or patient-history workflows.

Phase 3 is not a clinical-compliance certification. Until deployment, access-control, audit, backup, retention, and incident-response controls are verified, use synthetic data only and do not claim production clinical readiness.

## Entry gates

Phase 3 implementation must not be marked complete until these Phase 2 conditions are resolved or explicitly accepted as blockers:

- Backend API tests pass.
- Frontend typecheck and production build pass.
- Receptionist registration and walk-in appointment workflows are verified.
- Authorization and validation review is complete.
- Audit logging and deployment/backup decisions have owners.
- The current source/schema discrepancy around consultations and prescriptions is reconciled. The source tree currently contains the `MedicalRecord` model, while the Phase 2 plan refers to consultation and prescription modules that are not currently present under `/Users/tohid/Documents/Hospital/SmartCare-HMS/backend/src`.

## Operating rules

- Read and follow `/Users/tohid/Documents/Hospital/SmartCare-HMS/AGENTS.md` before every implementation task.
- Preserve current API behavior and existing patient, appointment, queue, and authentication workflows.
- Use small, reviewable changes. Update `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-3-progress.md` after each major area.
- Do not store file bytes, PDFs, images, or medical binaries in PostgreSQL.
- Store only private object references and metadata in PostgreSQL. Never expose a bucket URL directly.
- Every report read, download, upload, share, revoke, and failed access attempt must have an audit event once the Phase 2 audit foundation exists.
- Enforce authorization server-side using the authenticated user and patient/doctor relationship; do not trust patient IDs supplied by the browser.
- Do not log file contents, access tokens, medical text, or unnecessary personal data.
- Do not add a storage, PDF, email, push, or queue dependency without documenting the decision, configuration, secret handling, and test strategy first.
- Use synthetic fixtures in tests and browser workflows.

## Architecture decisions to settle before coding

### Private object storage

Use an AWS S3-compatible private bucket as the target architecture, consistent with `AGENTS.md`. The first implementation must define an adapter interface so tests can use an in-memory/fake provider without network access. Production access must use short-lived signed download URLs generated only after an authorization check.

Required decisions:

- Provider and region/endpoint.
- Bucket policy: private by default, no public ACLs.
- Object-key format that does not contain names, phone numbers, or other direct identifiers.
- Encryption at rest, TLS in transit, retention, deletion, and backup policy.
- Malware/virus scanning integration and quarantine behavior. A file must not become visible to patients or doctors before a successful scan.

### File validation

Version 1 allows PDF, JPEG, and PNG with a maximum size of 10 MB. Validate the extension, declared MIME type, detected content signature, size, and upload authorization. Reject mismatches, executable/polyglot content, empty files, and oversized requests before persistence. DICOM is explicitly deferred.

### PDF generation

Prescription PDF generation requires an approved PDF library and a stable prescription data contract. It must be generated server-side from authorized data, stored as a private object, and exposed through the same signed-access path as reports. The source of truth remains structured medical data; a PDF is a derived artifact.

### Notifications

Notifications must be modeled as application events and persisted delivery work, not sent inline from appointment/report requests:

```text
Domain event → notification record/queue → worker → provider → delivery result
```

The first provider scope is email and push only. SMS is deferred. Retries must be bounded and idempotent, and preference checks must occur before delivery.

## Execution order

1. **Phase 3.0 — Prerequisite and data-contract review**
   - Complete the Phase 2 entry gates.
   - Trace the existing `MedicalRecord` API/UI behavior and reconcile prescription ownership and terminology.
   - Define report status, report types, authorization matrix, retention rules, and API response shapes.

2. **Phase 3.1 — Medical report data model**
   - Add `MedicalReport` metadata with patient, uploader, type, title, description, private object key, size, detected MIME type, scan/status fields, and timestamps.
   - Use explicit enums and indexes for patient/date/type/status queries.
   - Add a migration and update `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/database.md`.

3. **Phase 3.2 — Secure storage and upload service**
   - Add a storage adapter, upload validation, quarantine state, scan integration boundary, and signed-access service.
   - Ensure failed storage/scan operations do not leave an accessible report record or orphaned object without a cleanup path.
   - Add upload size limits at both HTTP and application layers.

4. **Phase 3.3 — Report APIs and patient portal**
   - Add authenticated list/detail/download endpoints under `/api/v1`.
   - Patients can see only their own reports; filtering must support date range and report type.
   - Add the frontend `My Health → Reports` experience with loading, empty, error, and unauthorized states.

5. **Phase 3.4 — Doctor/staff access**
   - Permit a doctor to view reports only for a patient connected through an authorized care relationship, such as a called or completed consultation.
   - Define staff upload permissions separately from read permissions; do not grant broad patient access to all hospital users by default.

6. **Phase 3.5 — Prescription PDF**
   - Reconcile the current structured medical-record/prescription model.
   - Generate a versioned PDF containing hospital, doctor, patient, visit, diagnosis/advice, medicines, date, and signature/attestation fields.
   - Store the PDF privately and make patient download authorization explicit.

7. **Phase 3.6 — Consent-based sharing**
   - Add `ReportShare` with report, patient, recipient, expiry, hashed/revocable token, status, created/revoked timestamps, and audit linkage.
   - Never store a usable raw access token. Show it once if a share-link workflow requires it, and use constant-time verification with expiry/revocation checks.
   - Support patient create, list, revoke, and access-before/after-expiry behavior. Limit sharing to the patient’s own report and approved recipient types.

8. **Phase 3.7 — Notification engine**
   - Add notification records, preference-aware event handlers, delivery attempts, idempotency keys, and a worker boundary.
   - Implement report-ready, appointment-reminder, and serial/queue-alert events.
   - Start with a test provider and email/push adapters; defer real provider credentials until deployment preparation.

9. **Phase 3.8 — Notification preferences**
   - Add one preference record per user with appointment, queue, report, email, and push controls.
   - Apply preferences consistently and define mandatory security/service notices separately from opt-in notifications.

10. **Phase 3.9 — Communication foundation**
    - Add an authorized message/announcement model and API boundary with sender, recipient/audience, body, read status, and timestamps.
    - Prevent arbitrary patient-to-doctor messaging until moderation, consent, retention, and escalation rules are approved. Initial scope is hospital announcements and controlled system communication.

11. **Phase 3.10 — Verification and release preparation**
    - Run backend unit/API tests, frontend typecheck/build, migration verification, storage adapter tests, authorization tests, and browser tests for the supported workflows.
    - Update API, architecture, database, deployment, and user-guide documentation.
    - Record known limitations and remaining security/operational blockers before release.

## Initial API surface

Final routes must follow existing `/api/v1` conventions and response envelopes. Proposed routes are subject to the contract review:

```text
POST   /api/v1/reports
GET    /api/v1/reports
GET    /api/v1/reports/:id
GET    /api/v1/reports/:id/download
POST   /api/v1/reports/:id/shares
GET    /api/v1/reports/:id/shares
DELETE /api/v1/reports/:id/shares/:shareId
GET    /api/v1/report-shares/:token
GET    /api/v1/notifications
PATCH  /api/v1/notification-preferences
GET    /api/v1/messages
PATCH  /api/v1/messages/:id/read
```

No route is complete until its authentication, role authorization, patient/doctor ownership check, validation, error behavior, and audit event are tested.

## Database change outline

Expected additions, subject to the schema review:

- `MedicalReport` and a report-type/status enum.
- `ReportShare` and share status/recipient relations.
- `Notification`, `NotificationDeliveryAttempt`, and `NotificationPreference`.
- `Message` or `Announcement` with a deliberately narrow audience model.
- Optional prescription-document relation to the existing structured record.

All migrations must be additive and reversible where practical. Foreign keys, restrictive deletion behavior, indexes, token hashing, and timestamps must be reviewed before deployment.

## Testing requirements

### Report and storage tests

- Valid PDF/JPEG/PNG upload succeeds through the fake storage adapter.
- Extension/MIME/signature mismatch, empty, oversized, and disallowed uploads fail.
- Quarantined or scan-failed reports cannot be viewed or downloaded.
- A patient can list/download only their own available reports.
- An unrelated patient and an unrelated doctor are denied without data leakage.
- Signed URLs are short-lived and are not returned before authorization.

### Sharing tests

- Patient creates a share only for their report and approved recipient.
- Access succeeds before expiry and fails after expiry or revocation.
- Stored token material cannot be used as a raw token.
- Share and failed-access audit events are emitted.

### Prescription tests

- Authorized doctor creates/updates a prescription using validated medicines.
- Generated PDF contains the approved fields and is stored outside PostgreSQL.
- Patient can download only their own prescription document.
- PDF generation failures do not publish a partial document.

### Notification and communication tests

- Events produce one idempotent notification job.
- Disabled channels/preferences suppress delivery.
- Failed delivery retries are bounded and recorded.
- Announcement/message visibility follows the audience and ownership rules.
- Read-state updates cannot affect another user’s messages.

## Definition of done

- Database migrations apply cleanly to a fresh and existing non-production database.
- Medical bytes are stored only in private object storage; PostgreSQL contains metadata/references.
- All report, share, prescription-document, notification, and message endpoints have tested authorization.
- Backend build, backend unit/API tests, frontend typecheck/build, and relevant browser tests pass.
- Deployment secrets, storage policy, worker operation, retention, backup/restore, and incident procedures are documented.
- `/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-3-progress.md` contains exact commands, changed files, evidence, limitations, and remaining blockers.

## Codex execution instruction

```text
Read /Users/tohid/Documents/Hospital/SmartCare-HMS/AGENTS.md.

Execute SmartCare v0.1 Phase 3 according to
/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-3-plan.md.

Complete the Phase 2 entry gates first. Preserve existing workflows, use private
S3-compatible storage, never store medical file bytes in PostgreSQL, add tests,
and update documentation/phase-3-progress.md after every major area.

Implement in the documented order:
1. Prerequisite/data-contract review
2. Medical report model
3. Secure storage/upload
4. Patient report portal
5. Doctor/staff access
6. Prescription PDF
7. Consent sharing
8. Notification engine
9. Notification preferences
10. Communication foundation
11. Automated verification and release preparation
```