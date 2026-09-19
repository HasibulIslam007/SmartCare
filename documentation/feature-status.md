# SmartCare v0.1 Feature Status

**Baseline:** `release/v0.1`, audited 2026-09-19. “Complete” means implemented and covered by the current verification evidence; it does not mean production-hardened.

## Authentication and roles

**Status: ✅ Complete for local pilot; production hardening required**

Completed:

- Patient registration and login
- Argon2id password hashing
- 15-minute JWT access tokens
- HttpOnly browser session cookie
- Patient, doctor, receptionist, and admin roles
- API role and ownership checks
- Invalid/expired token and demotion coverage

Missing/hardening:

- Email/phone verification
- Password recovery
- Staff MFA
- Session revocation and persistent security audit log

## Patient profiles

**Status: ✅ Complete for local pilot**

Completed:

- Patient self-profile
- Date of birth, gender, blood group, address, emergency contact, allergies
- Authorized patient/history access

Issues:

- Clinical-data retention/privacy policy and production audit controls are not configured.

## Doctor directory and departments

**Status: 🟡 Needs review**

Completed:

- Public searchable doctor directory
- Doctor profile and department information
- Department listing
- Weekly schedule and availability
- Admin doctor/department creation

Needs review:

- Edit/archive/restore changes are currently uncommitted
- Validate migration and UI regression coverage for those changes
- Confirm archival behavior against active appointments

## Appointments and serial system

**Status: ✅ Complete for local pilot**

Completed:

- Patient booking
- Staff booking for a patient
- Date/window validation
- Capacity checks and duplicate prevention
- Transactional serial generation
- Cancellation without serial reuse

Issues:

- Load testing and production observability are missing.
- Pagination/list caps need a product decision for larger deployments.

## Queue

**Status: ✅ Complete for local pilot**

Completed:

- Queue summary
- Next/called/completed transitions
- Patient position/current serial display
- Frontend polling

Issues:

- No push, email, or SMS notification delivery.
- Polling behavior needs load testing.

## Consultations and prescriptions

**Status: 🟡 Needs review**

Completed:

- Treating doctor can create consultation record
- Notes, diagnosis, advice, follow-up, and medicine data
- Authorized patient and doctor history access
- Browser print/save path in the UI

Missing:

- Dedicated server-generated prescription PDF
- Report/file uploads and protected downloads
- Persistent clinical audit trail

## Receptionist workflows

**Status: 🟡 Partial**

Completed:

- Sign-in and authorized appointment booking
- Patient lookup
- Queue management

Missing:

- Full receptionist-led patient registration workflow

## Administration

**Status: 🟡 Partial**

Completed:

- Role assignment
- Department/doctor management foundations
- Dashboard counts and daily appointment totals
- Settings work exists in the current working tree

Needs review:

- Verify all current admin changes after migration/build/test rerun.
- Add persistent audit logging for privileged operations.

## Deployment and operations

**Status: ❌ Not ready**

Completed:

- Local PostgreSQL/Compose instructions
- Environment templates
- Build and migration commands

Missing:

- Public hosting
- Production database and secrets management
- TLS/reverse proxy topology
- Monitoring, alerting, backup/restore drill, rollback plan

## Explicitly deferred to v0.2 or later

- AI/CareBot/OpenAI integration
- Flutter mobile app
- Payments
- Telemedicine
- Advanced analytics
- Notifications (push/email/SMS), unless explicitly promoted into the pilot plan
- S3-compatible report storage and sharing
