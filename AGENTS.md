# SmartCare Hospital Management System (SHMS)
## Codex Development Specification
## Version 1.0

---

# 1. Project Overview

## Project Name

SmartCare Hospital Management System (SHMS)

## Project Type

A full-stack hospital management platform consisting of:

- Web application
- Mobile application
- Backend API
- Database system
- AI healthcare assistant


## Main Goal

Build a modern digital healthcare ecosystem that connects:

- Patients
- Doctors
- Receptionists
- Hospital administrators


The system should reduce patient waiting time, simplify appointments, digitize medical records, and improve communication between hospitals and patients.

---

# 2. Product Vision

The platform should allow a patient to:

- Find doctors
- See doctor visiting schedules
- Book appointments
- Receive digital serial numbers
- Track live waiting queue
- View medical reports
- Access prescriptions
- Communicate with AI assistant


The platform should allow doctors to:

- Manage patient queues
- View medical history
- Write prescriptions
- Upload reports
- Manage schedules


The platform should allow hospitals to:

- Manage doctors
- Manage departments
- Monitor patient flow
- Analyze hospital operations

---

# 3. Technology Stack

## Frontend Web

Use:

```
Next.js 15+
TypeScript
Tailwind CSS
Shadcn UI
React Query
Zustand
```

Requirements:

- Responsive design
- Mobile friendly
- Clean healthcare UI
- Accessibility focused


---

# Mobile Application

Use:

```
Flutter
Dart
```

Target:

- Android
- iOS


---

# Backend

Use:

```
NestJS
TypeScript
```

Architecture:

- Modular architecture
- REST API
- JWT authentication
- Role-based permissions


---

# Database

Use:

```
PostgreSQL
Prisma ORM
```

Database must support:

- Large patient records
- Medical history
- Appointments
- Reports
- Analytics


---

# Storage

Use:

```
AWS S3 compatible storage
```

For:

- Medical reports
- Images
- Documents
- Prescriptions


---

# AI Integration

Use:

```
OpenAI API
```

AI features:

- Hospital assistant
- Appointment assistant
- Medical report explanation
- FAQ answering


AI must not:

- Diagnose patients
- Replace doctors
- Give unsafe medical advice


---

# 4. Development Principles

Follow these rules:

## Code Quality

Always:

- Write clean production-level code
- Use TypeScript strictly
- Avoid unnecessary complexity
- Create reusable components
- Add meaningful comments


## Security

Medical data is sensitive.

Always implement:

- Authentication
- Authorization
- Data validation
- Secure API endpoints
- Password hashing


Never:

- Store plain passwords
- Expose private patient data
- Allow unauthorized access


---

# 5. Project Structure


```
SmartCare-HMS

│
├── frontend
│
│   ├── app
│   ├── components
│   ├── hooks
│   ├── services
│   └── utils
│
│
├── backend
│
│   ├── auth
│   ├── users
│   ├── patients
│   ├── doctors
│   ├── departments
│   ├── appointments
│   ├── queue
│   ├── prescriptions
│   ├── reports
│   ├── notifications
│   └── ai
│
│
├── mobile
│
├── database
│
├── documentation
│
└── README.md
```

---

# 6. User Roles

The system has four roles.


## Patient

Permissions:

- Create account
- Login
- View doctors
- Book appointments
- View serial
- Track queue
- View reports
- View prescriptions
- Use AI assistant


---

## Doctor

Permissions:

- Login
- View assigned patients
- View medical history
- Call next patient
- Add consultation notes
- Create prescriptions
- Upload reports


---

## Receptionist

Permissions:

- Register patients
- Create appointments
- Manage queues


---

## Admin

Permissions:

- Manage doctors
- Manage departments
- Manage users
- View analytics
- Manage hospital settings

---

# 7. Core Modules


# Module 1: Authentication


Features:

- Registration
- Login
- JWT authentication
- Password encryption
- Role-based access


Database:

Users table


Fields:

```
id
name
phone
email
password_hash
role
created_at
updated_at
```

---

# Module 2: Patient Management


Patient profile:

```
id
user_id
date_of_birth
gender
blood_group
address
emergency_contact
allergies
```

---

# Module 3: Doctor Management


Doctor profile:

```
id
user_id
department_id
qualification
specialization
experience
consultation_fee
room_number
```

---

# Module 4: Department Management


Example:

```
Cardiology

Neurology

Orthopedics

Pediatrics
```


---

# Module 5: Doctor Schedule


Doctor availability:

```
doctor_id

day

start_time

end_time

maximum_patients
```

Example:

```
Dr Ahmed

Monday

5PM - 9PM

40 patients
```

---

# Module 6: Appointment System


Patient workflow:


```
Choose Doctor

↓

Choose Date

↓

Generate Serial

↓

Receive Confirmation
```


Appointment table:


```
id

patient_id

doctor_id

date

serial_number

status
```


Status:

```
WAITING

CALLED

COMPLETED

CANCELLED
```

---

# Module 7: Live Queue System


Doctor dashboard:


```
Current:

25


Next:

26
```


Functions:

- Call next patient
- Update waiting display
- Notify patient


---

# Module 8: Medical Record System


Store:

- Patient history
- Doctor notes
- Diagnosis
- Follow-up


---

# Module 9: Prescription System


Doctor creates:


```
Medicine

Dose

Frequency

Duration

Advice
```


Generate PDF prescription.

---

# Module 10: Report Management


Patients can:

- View reports
- Download reports
- Share reports


Supported:

- PDF
- Images


---

# Module 11: Notification System


Support:

- Push notifications
- Email
- SMS


Events:

- Appointment reminder
- Serial approaching
- Report ready


---

# Module 12: AI Assistant


Name:

CareBot AI


Functions:


## Hospital Assistant

Example:

"Where is cardiology?"

Answer from hospital database.


## Appointment Assistant

Example:

"I have skin problems."

Suggest appropriate department.


## Report Explanation

Explain medical terms simply.

Always add:

"Consult your doctor for medical decisions."

---

# 8. Development Roadmap


## Phase 1: Foundation

Build:

- Project setup
- Database
- Authentication
- User roles


Deliverable:

Users can register/login.

---

## Phase 2: Hospital Core


Build:

- Departments
- Doctors
- Doctor schedules


Deliverable:

Patients can find doctors.

---

## Phase 3: Appointment System


Build:

- Booking
- Serial generation
- Queue management


Deliverable:

Hospital waiting system works.

---

## Phase 4: Medical Records


Build:

- Patient portal
- Reports
- Prescriptions


Deliverable:

Digital healthcare record system.

---

## Phase 5: Mobile App


Build Flutter app:

- Patient dashboard
- Appointment
- Reports
- Notifications


---

## Phase 6: AI Integration


Build:

- CareBot
- Report explanation
- Hospital assistant


---

# 9. API Standards


All APIs should:

Use:

```
/api/v1/
```


Example:

```
POST /api/v1/auth/register

POST /api/v1/auth/login

GET /api/v1/doctors

POST /api/v1/appointments
```


Response format:

```json
{
 "success":true,
 "message":"",
 "data":{}
}
```

---

# 10. Testing Requirements


Every module must include:

- Unit tests
- API tests
- Error handling


Before marking a feature complete:

Check:

- Security
- Validation
- Edge cases

---

# 11. Documentation Requirements


Maintain:

```
documentation/

├── architecture.md

├── database.md

├── api.md

├── deployment.md

└── user-guide.md
```

---

# 12. Current Development Priority


Start immediately with:

## Sprint 1

Build:

1. Backend setup
2. PostgreSQL connection
3. Prisma setup
4. User model
5. Authentication
6. JWT
7. Role management


Do not start advanced features before completing the foundation.

---

# Codex Behavior Instructions

## SmartCare Database Rules

- Database: PostgreSQL 16.
- ORM: Prisma.
- Prisma configuration: `backend/prisma.config.ts`.
- Prisma schema: `database/schema.prisma`.
- Prisma migrations: `database/migrations/`.
- Run Prisma commands from `/Users/tohid/Documents/Hospital/SmartCare-HMS/backend`.
- Do not assume `backend/prisma/schema.prisma` exists.
- Do not create another development database unless explicitly requested. The current local SmartCare database is configured through `backend/.env` and uses `127.0.0.1:55432/smartcare`; do not change it to port `5432` without intentionally migrating the database.
- Every schema change requires an additive Prisma migration, documentation update, and test or migration-status verification.
- Never modify a production database directly. Production changes must go through the reviewed migration/deployment process.
- Never permanently delete medical records. Use an approved soft-delete or archival strategy for healthcare data.
- Store medical files outside PostgreSQL. PostgreSQL stores metadata and private storage references only.
- Do not store PDF, image, or other medical file bytes in database columns.

When working on this project:

1. Understand existing architecture before modifying files.
2. Do not rewrite working code unnecessarily.
3. Ask before making major architectural changes.
4. Explain important decisions.
5. Keep code production-ready.
6. Maintain documentation.
7. Create commits with meaningful messages.

---

# Final Product Goal

The final system should become:

A complete hospital digital platform where patients can access healthcare services easily, doctors can manage patients efficiently, and hospitals can operate digitally.

---

