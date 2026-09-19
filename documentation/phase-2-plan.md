# SmartCare v0.1 — Phase 2 Execution Plan

**Status:** Planned  
**Scope:** Production preparation and critical fixes for a controlled hospital pilot  
**Baseline:** `release/v0.1`  
**Repository:** `/Users/tohid/Documents/Hospital/SmartCare-HMS`

## Mission

Make SmartCare v0.1 stable enough for a controlled hospital pilot without adding AI, a mobile application, payments, or other advanced features in this phase.

## Operating Rules

- Read and follow `/Users/tohid/Documents/Hospital/SmartCare-HMS/AGENTS.md` before making changes.
- Understand existing modules and workflows before modifying them.
- Do not rebuild existing modules or remove working features.
- Prefer small, production-safe changes that preserve existing API behavior.
- Use only libraries already present in the repository unless a dependency is justified by an approved Phase 2 task.
- After each major module, run the relevant tests and record the result in `phase-2-progress.md`.
- Update the documentation and progress tracker as work is completed.
- Use synthetic data only until release blockers are resolved; do not claim compliance certification or clinical readiness.
- Keep `main` and `release/v0.1` protected as release checkpoints; perform feature work on an appropriately named working branch.

## Execution Order

1. Backend build fix
2. Backend code review
3. Reception workflow
4. Doctor and department management
5. Search and pagination
6. Security foundation
7. Audit logging
8. Environment preparation
9. Frontend production review
10. Playwright browser testing
11. Deployment preparation

Each item must have an implementation summary, changed-file list, verification evidence, and any remaining blocker recorded in `documentation/phase-2-progress.md`.

---

## Phase 2.1 — Backend Build Stabilization

### Goal

The backend must build and its existing tests must pass.

### Tasks

- Remove the duplicate `search` property from `backend/src/hospital/hospital.dto.ts` `DoctorQuery`.
- Preserve the existing DTO inheritance chain, validation decorators, and API query parameter behavior.
- Run `npm run build` from `backend/`.
- Run `npm test` from `backend/`.

### Acceptance criteria

- No TypeScript build errors.
- Backend build exits successfully.
- Existing backend tests pass.
- No unrelated API or DTO behavior changes.

---

## Phase 2.2 — Backend Code Review

Audit the following modules without rewriting working code:

```text
auth
users
patients
doctors
hospital
appointments
queue
consultations
prescriptions
```

Check every endpoint for:

- Input validation using the existing validation approach.
- Correct HTTP exceptions and safe error responses.
- Authentication and role/ownership authorization.
- Duplicate logic that can be safely consolidated.
- Sensitive-data exposure, insecure defaults, and missing audit/security controls.

### Acceptance criteria

- Every API has input validation, appropriate error handling, and an authorization decision.
- Security findings are either fixed with tests or documented as explicit blockers.

---

## Phase 2.3 — Receptionist Workflow

### Patient registration

Provide a receptionist workflow for creating a patient with:

- Full name
- Phone
- Date of birth
- Gender
- Blood group
- Address
- Emergency contact
- Allergies

### Existing-patient search

Allow search by:

- Phone number
- Patient ID
- Name

Flow:

```text
Receptionist → Search patient → Existing patient: select
                           ↘ New patient: create
```

### Walk-in appointment

Allow a receptionist to select a patient, doctor, and date, then generate a serial number and place the appointment in the queue.

### Duplicate prevention

Prevent duplicate appointments for the same patient, doctor, and day. Enforce this in the service/database transaction path, not only in the UI.

### Acceptance criteria

- A receptionist can register a new patient.
- A receptionist can find and select an existing patient.
- A receptionist can create a walk-in appointment and receive a serial.
- Duplicate same-patient/same-doctor/same-day appointments are rejected safely.
- Role and ownership tests cover the workflow.

---

## Phase 2.4 — Doctor and Department Management

### Doctor management

Admin users must be able to create, edit, and archive doctors with:

- Name
- Department
- Qualification
- Experience
- Specialization
- Consultation fee
- Room number
- Status

Use the existing archive model and API conventions where possible. Expose status consistently as active, inactive, or archived only if that mapping is compatible with the current schema and workflows.

### Department management

Admin users must be able to create, edit, and archive departments, including representative departments such as Cardiology, Neurology, and Orthopedics.

### Acceptance criteria

- Admin authorization is enforced for all management operations.
- Active and archived records are filtered consistently.
- Existing public doctor/department discovery behavior is preserved.
- Service and API tests cover create, update, archive, validation, and authorization paths.

---

## Phase 2.5 — Search and Pagination

All list endpoints must support stable pagination and relevant filters. Preserve the repository’s existing `page`/`pageSize` contract unless a compatibility migration is explicitly designed and tested.

### Doctors

- Name/search
- Department
- Status

### Patients

- Name
- Phone
- Patient ID

### Appointments

- Date
- Doctor
- Status

Example target usage:

```text
?page=1&pageSize=20&search=ahmed
```

### Acceptance criteria

- Bounds and types are validated.
- Results include correct pagination metadata.
- Filters compose correctly and do not bypass authorization or archive rules.
- Ordering is deterministic.
- Tests cover empty, first, middle, last, and invalid-page cases.

---

## Phase 2.6 — Security Foundation

### Authentication

- Confirm passwords use Argon2id through the existing password service.
- Configure an explicit JWT expiration time.
- Keep secrets and token configuration environment-driven.

### Session management

Implement refresh-token sessions only after reviewing the current JWT flow and schema. Required capabilities:

- Refresh-token rotation or equivalent replay protection.
- Logout current session.
- Logout all sessions.
- Token/session revocation.

Store only appropriately protected token material and add tests for expiry, revocation, and reuse.

### Rate limiting

Protect:

- `POST /auth/login`
- `POST /auth/register`

Use the existing NestJS Throttler dependency/configuration where possible. Document the process-local limitation for multi-instance deployments until shared storage is available.

### Authorization tests

At minimum verify:

- Patients cannot access admin operations.
- Doctors cannot access admin operations.
- Receptionists cannot modify system settings.
- Resource ownership and treating-doctor rules remain enforced.

---

## Phase 2.7 — Audit Logging

Design and add an `audit_logs` database model/migration with:

- `id`
- `user_id`
- `action`
- `entity`
- `entity_id`
- `timestamp`
- `ip_address`

Log security-relevant and clinical workflow events, including:

- Admin created doctor.
- Doctor viewed patient.
- Receptionist created appointment.
- Patient downloaded a report.

Avoid storing secrets, passwords, raw tokens, or unnecessary medical content in audit records. Add service/API tests and document retention/access expectations.

---

## Phase 2.8 — Production Environment Preparation

Maintain safe templates:

```text
backend/.env.example
backend/.env.production.example
frontend/.env.example
```

Never commit `.env` or real credentials.

Document configuration for:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES`
- `APP_URL`
- `STORAGE_URL`
- Email configuration

Use names matching the current application configuration, or document any deliberate migration. Validate required production variables at startup.

---

## Phase 2.9 — Frontend Production Review

Review existing pages and workflows for:

### Patient

- Login
- Register
- Dashboard
- Doctors
- Appointment
- Queue
- Prescription/records

### Doctor

- Dashboard
- Patients
- Consultation
- Prescription

### Admin

- Doctors
- Departments
- Settings

Fix only verified issues involving:

- Broken links and API paths
- Loading states
- Empty states
- Actionable error messages
- Mobile responsiveness
- Unauthorized/expired-session behavior

Run the frontend production build and typecheck after changes.

---

## Phase 2.10 — Automated Browser Testing

Use Playwright only after confirming the repository’s supported Node/package-manager setup and documenting the dependency addition. Create:

```text
frontend/tests/
```

Cover these journeys with stable seeded/test data and no real patient data:

### Patient

```text
Login → Find doctor → Book appointment → View queue
```

### Doctor

```text
Login → Open patient → Create consultation → Create prescription
```

### Receptionist

```text
Login → Register patient → Create appointment
```

### Admin

```text
Login → Create doctor → Update schedule
```

Document environment prerequisites, test data, browser configuration, and known limitations.

---

## Phase 2.11 — Deployment Preparation

### Application builds

Run and record:

```bash
cd backend && npm run build
cd frontend && npm run build
```

### Database operations

Document and test, using non-production data where possible:

- Migration deployment process.
- Backup process.
- Restore process.
- Rollback/forward compatibility expectations.

### Operational readiness

Document:

- Process supervision and startup commands.
- Reverse proxy/TLS requirements.
- CORS and trusted-proxy configuration.
- Secret handling.
- Logs, health checks, and incident response ownership.

---

## Phase 2 Completion Checklist

### Code

- [ ] Backend builds.
- [ ] Frontend builds.
- [ ] Backend and frontend tests pass.
- [ ] No TypeScript errors.

### Hospital workflow

- [ ] Reception can register patients.
- [ ] Reception can search and select patients.
- [ ] Reception can create walk-in appointments and serials.
- [ ] Doctors can manage patients and consultations.
- [ ] Admin can manage doctors and departments.
- [ ] Appointments and queues work without duplicate bookings.

### Security

- [ ] Passwords use Argon2id.
- [ ] JWT expiry is configured.
- [ ] Session revocation is tested.
- [ ] Permissions are tested.
- [ ] Rate limiting is enabled for authentication endpoints.
- [ ] Audit logging is active for defined events.

### Release

- [ ] Production environment is documented.
- [ ] Deployment instructions are ready.
- [ ] Migration process is documented.
- [ ] Backup and restore plan is ready and tested.
- [ ] Remaining pilot blockers have owners and acceptance tests.

## Codex Execution Instruction

```text
Read /Users/tohid/Documents/Hospital/SmartCare-HMS/AGENTS.md.

Execute SmartCare v0.1 Phase 2 according to
/Users/tohid/Documents/Hospital/SmartCare-HMS/documentation/phase-2-plan.md.

Follow the phase plan exactly.

Rules:
- Do not rebuild existing modules.
- Do not remove working features.
- Make small production-safe changes.
- Preserve API compatibility unless a documented migration is approved.
- After each major module, run the relevant tests.
- Update documentation.
- Update documentation/phase-2-progress.md after every major phase.

Work in this order:
1. Backend build fix
2. Code review
3. Reception workflow
4. Doctor/department management
5. Pagination/search
6. Security foundation
7. Audit logging
8. Environment preparation
9. Frontend review
10. Playwright testing
11. Deployment preparation
```