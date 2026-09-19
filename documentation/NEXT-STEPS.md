# Resume SmartCare from this checkpoint

Read `../AGENTS.md`, `requirements.md`, and `verification.md` before continuing. Do not recreate the project.

## Completed baseline

NestJS + Prisma + PostgreSQL backend, four-role authentication, Next.js responsive website, patient profiles, doctor directory/schedules, appointments/serials, live queue polling, staff workspace, consultation records/prescriptions, and initial administration.

## Finish the web product

1. Complete browser walkthroughs for doctor, receptionist and administrator; fix any discovered edge cases. Add durable browser regression tests.
2. Complete doctor/department editing and archival, receptionist patient registration, pagination/search, and configurable hospital settings.
3. Add secure S3 report upload/download, file validation/scanning, patient access and expiring consent-based sharing.
4. Generate one properly formatted PDF per prescription, including hospital, doctor, patient and visit details.
5. Add notification preferences and background delivery for appointment reminders, approaching serials and report readiness (email/SMS/push).
6. Expand analytics with date ranges and useful patient-flow trends.

## Complete the original platform

7. Build the Flutter Android/iOS patient app against the verified API.
8. Integrate CareBot with OpenAI, grounded in the hospital directory and FAQs, with the required medical boundaries and report-explanation disclaimer.

## Prepare for real use

9. Add account verification/recovery, staff MFA, revocable sessions, audit logging, shared rate limits and monitoring.
10. Test authorization comprehensively, load/concurrency, accessibility, backup restoration and deployment recovery.
11. Configure staging and production hosting, managed PostgreSQL, private object storage, HTTPS/domain, CI checks and secret management.
12. Conduct acceptance testing with the hospital using synthetic data before handling real patient records.

External service configuration will be needed for S3, email/SMS/push, OpenAI and deployment. No external accounts have been purchased or provisioned.
