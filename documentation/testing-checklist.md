# SmartCare v0.1 Testing Checklist

Use synthetic accounts/data. Record date, browser, environment, account role, result, and defect ID for every failed item.

## Automated baseline

- [ ] Backend build (`cd backend && npm run build`)
- [ ] Backend typecheck
- [ ] Backend unit tests
- [ ] Isolated PostgreSQL test database migrated
- [ ] Backend API/e2e tests
- [ ] Frontend production build
- [ ] Frontend typecheck
- [ ] Frontend smoke test on desktop and 390px viewport
- [ ] No browser console errors
- [ ] Accessibility review of forms, dialogs, navigation, and focus order
- [ ] Concurrent booking/capacity test
- [ ] Migration rollback/restore procedure exercised in a disposable environment

## Patient testing

### Registration and session

- [ ] Create a patient account
- [ ] Reject duplicate email/phone
- [ ] Reject weak/invalid password
- [ ] Login with valid credentials
- [ ] Reject wrong password without revealing account details
- [ ] Logout clears the browser session
- [ ] Expired/invalid token is rejected
- [ ] Patient cannot access `/admin`
- [ ] Patient cannot assign roles or create doctors/departments

### Profile and discovery

- [ ] View patient profile
- [ ] Update patient profile
- [ ] Search doctors
- [ ] Filter/browse departments
- [ ] View doctor profile
- [ ] View doctor schedule and availability

### Appointment and queue

- [ ] Book a valid appointment
- [ ] Receive a unique serial
- [ ] Reject capacity overflow
- [ ] Reject duplicate active booking
- [ ] Cancel an eligible appointment
- [ ] Confirm cancelled serial is not reused
- [ ] View queue/current serial
- [ ] Observe queue polling update
- [ ] Patient cannot view another patient’s private history

## Doctor testing

- [ ] Login as doctor
- [ ] Doctor cannot access admin-only endpoints/pages
- [ ] View assigned appointment/patient list
- [ ] Open an authorized patient history
- [ ] Cannot open unrelated doctor/patient history
- [ ] View and update own schedule where permitted
- [ ] Call next patient
- [ ] Open consultation form for called visit
- [ ] Add consultation notes/diagnosis/advice
- [ ] Create prescription medicine entries
- [ ] Complete visit
- [ ] Confirm patient can view the resulting record

## Receptionist testing

- [ ] Login as receptionist
- [ ] Search existing patients
- [ ] Book appointment for an existing patient
- [ ] Manage queue
- [ ] Confirm receptionist cannot change roles or admin settings
- [ ] Confirm receptionist registration workflow is either tested or explicitly excluded from pilot scope

## Admin testing

- [ ] Login as admin
- [ ] View dashboard/analytics
- [ ] Add department
- [ ] Edit department
- [ ] Archive/restore department under allowed conditions
- [ ] Add doctor profile
- [ ] Edit doctor profile
- [ ] Archive/restore doctor under allowed conditions
- [ ] Assign a role
- [ ] Confirm admin cannot change own role if that is the intended policy
- [ ] Update hospital settings if included in the release build
- [ ] Confirm all privileged changes are logged, or record the audit-log gap as a blocker

## Security quick audit

- [ ] Verify password hashes are Argon2id and no plaintext password is stored
- [ ] Verify JWT contains no medical data
- [ ] Verify production cookie uses Secure and HTTPS
- [ ] Verify CORS/origin configuration matches the deployed frontend only
- [ ] Verify API proxy route allowlist rejects arbitrary upstream paths
- [ ] Verify request size/timeouts and rate limits
- [ ] Verify secrets are not in Git, build artifacts, logs, or client bundles
- [ ] Verify database uses password/certificate authentication, not local trust
- [ ] Verify backups are encrypted and restore has been demonstrated