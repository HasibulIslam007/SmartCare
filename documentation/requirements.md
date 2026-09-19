# Requirements status

The original specification is preserved in `AGENTS.md`. Work follows its dependency order. “Implemented” means code exists; see verification notes for the checks actually run.

| Requirement | State | Detail |
|---|---|---|
| NestJS / strict TypeScript | Implemented | Modular API, DTO validation, consistent responses |
| PostgreSQL / Prisma | Implemented | Versioned migrations and generated client |
| Registration / login / JWT | Implemented | Patient-only public registration, Argon2id, 15-minute tokens |
| Four roles | Implemented | Live database role lookup, admin role assignment |
| Next.js / Tailwind / shadcn / React Query / Zustand | Implemented | Responsive patient and staff website |
| Patient profile | Implemented | Birth date, gender, blood group, address, emergency contact, allergies |
| Departments | Partial | List and create; editing/archival still needed |
| Doctors | Partial | Directory, search, profile creation; editing/archival still needed |
| Weekly schedules | Implemented | Per-weekday capacity and visiting hours; one session per weekday |
| Appointments / serial generation | Implemented | 90-day booking window, row locking, capacity and duplicate checks |
| Live waiting queue | Implemented | 10-second patient polling, next/called/completed transitions |
| Patient notifications | Pending | Queue page updates only; no push, email or SMS yet |
| Consultation records / prescriptions | Partial | Treating-doctor entry, patient access, browser print/save PDF |
| Standalone prescription PDF | Pending | Dedicated server-generated document not implemented |
| Medical report files | Pending | Requires S3-compatible bucket, upload validation and protected downloads |
| Report sharing | Pending | Requires consent, expiring links and access audit |
| Doctor medical history UI | Implemented | Treating doctor can open prior consultation notes while documenting a visit |
| Receptionist registration | Partial | Can book existing patients; staff registration workflow still needed |
| Administration / analytics | Partial | User roles, create doctor/department, counts and daily status totals |
| Hospital settings | Pending | Single hospital with Asia/Dhaka timezone currently configured in code |
| Flutter Android / iOS | Pending | Reserved directory; no mobile app delivered yet |
| CareBot OpenAI integration | Pending | No model calls or simulated AI responses are exposed |
| Production deployment | Pending | No public deployment has been made |

## Next milestone

Finish report storage, individual prescription PDFs and notifications, then build Flutter and CareBot. External integrations need the actual service configuration. The application should continue to make those missing capabilities explicit rather than presenting fabricated results.

## Before real clinical use

Add email/phone verification and recovery; MFA/session revocation for staff; persistent audit trails; distributed rate limiting; pagination beyond the development caps; archival/edit flows; report malware scanning; encrypted backups and restoration checks; operational monitoring; and a clinical/security review. Current log and database configurations are for local synthetic data.
