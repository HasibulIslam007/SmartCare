# User guide

## Patient

1. Open http://127.0.0.1:3000 and choose Sign in, then Create an account.
2. Enter your name, international phone, email and a password of at least 12 characters.
3. Open Find a doctor; search by name or filter by department.
4. Open a profile, choose an available date, describe the visit and confirm. Your serial is assigned after saving.
5. Appointments shows your visits. Cancel a waiting visit through its confirmation dialog.
6. Live queue shows the current serial and your position, updating every 10 seconds.
7. My profile stores your background/contact details. Medical records shows notes and prescriptions after the treating doctor saves them. Print records opens your browser’s print/save-PDF flow.

## Doctor

Sign in with a doctor account. In Care workspace, select your profile and call the next waiting patient. Write consultation saves notes, diagnosis, advice, follow-up and prescription. Complete visit finishes the current consultation. Update weekly visiting hours in the schedule form.

## Receptionist

Sign in, choose the consulting doctor in Care workspace, and book a visit for an existing registered patient. Call next and complete controls manage the waiting room. Consultation records are not returned to reception accounts.

## Administrator

Administration shows daily counts and registered users. Assign staff roles, add departments, then add doctor profiles for accounts assigned the Doctor role. Add doctor schedules in Care workspace. You cannot change your own administrator role.

## Current limits

After 15 minutes the access token expires; sign in again. There is no password recovery or background notification delivery yet. Report files, Flutter and CareBot remain future milestones. The seeded doctor directory is fictional and intended for development only.
