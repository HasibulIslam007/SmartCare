# Database design

The source of truth is `database/schema.prisma`; migrations are in `database/migrations`.

| Entity | Key relationships and constraints |
|---|---|
| User | UUID; unique normalized email and international phone; password hash; Role enum |
| PatientProfile | One-to-one User; optional clinical background and contact fields |
| Department | Unique name; description and location |
| Doctor | One-to-one staff User; belongs to Department; fee in whole BDT |
| Schedule | Unique doctor + weekday (Sunday=0); HH:mm times and capacity |
| Appointment | Patient User + Doctor; DATE; unique doctor/date/serial; status enum |
| MedicalRecord | One record per appointment; notes, diagnosis, advice, optional follow-up and medicine JSON |
| MedicalReport | Private storage reference and metadata; patient and uploader both reference User; restrictive deletion; indexed by patient/status/date |

Records use UUIDs. Sensitive medical data is not stored in JWT claims. `password_hash` is excluded through explicit user selections. Reception/admin appointment lists exclude consultation records. History is restricted to the patient or doctors with a called/completed consultation relationship.

Appointments are indexed by patient/date and doctor/date/status. PostgreSQL enforces unique serials; application transactions enforce active-booking uniqueness and capacity under a shared doctor row lock. Cancellation releases capacity but does not recycle the serial.

Deleting appointments with medical records and users with appointments is restricted. Profile and schedule rows cascade only with their owning user/doctor. No destructive deletion API is exposed.

MedicalReport is now represented as an additive metadata table. It stores only a private object key and file metadata; file bytes remain outside PostgreSQL. Notifications/delivery attempts, audit events, sharing, and revocable sessions remain planned.
