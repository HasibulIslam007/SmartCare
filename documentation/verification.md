# Verification checkpoint — 19 September 2026

- Backend production build: passed.
- Backend unit tests: 5 suites, 11 tests passed.
- Real PostgreSQL API tests: 2 suites, 24 tests passed.
- Frontend production build: passed using `next build --webpack`.
- Frontend TypeScript: passed as part of the production build.
- Desktop and 390px phone browser layouts: rendered and visually inspected.
- Browser error check: no JavaScript errors reported during the layout check.
- Browser booking: synthetic patient booked a real database appointment for 19 September 2026 and received serial 01.
- Browser registration: synthetic patient submitted successfully; API returned 201 and the dashboard rendered the signed-in patient and real database doctor directory.

The API suite verifies registration, password storage, duplicate account handling, expired/invalid tokens, role authorization and demotion, real concurrent bookings/capacity, appointment ownership, queue transitions, record access, and patient profiles. UI checks are not a substitute for a full accessibility audit or tests of every screen.

## Local recovery

macOS had offloaded source/configuration and some dependency files in Documents. Dependencies were reinstalled from the lockfile and known configuration restored. The former local environment file was preserved at `.local/backend-env-cloud-backup`; a fresh local JWT secret was generated. Existing browser sessions from the earlier secret need to sign in again.

The test environment now initializes before importing the Nest application and does not load the development environment file.

The application is a development milestone, with synthetic demo users and doctors. Remaining functional and production requirements are listed in `requirements.md`.
