import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";
import { PasswordService } from "../src/auth/password.service";

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true")
    throw new Error(
      "Demo seed requires SEED_DEMO=true and a non-production environment",
    );
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const passwords = new PasswordService();
  const people = [
    {
      name: "Dr. Ayesha Rahman",
      department: "Cardiology",
      specialty: "Cardiologist",
      qualifications: "MBBS, FCPS (Cardiology)",
      experience: 14,
      fee: 1200,
      room: "201",
      location: "2nd floor",
      description: "Specialist care for your heart and cardiovascular health.",
    },
    {
      name: "Dr. Farhan Ahmed",
      department: "Neurology",
      specialty: "Neurologist",
      qualifications: "MBBS, MD (Neurology)",
      experience: 11,
      fee: 1500,
      room: "302",
      location: "3rd floor",
      description:
        "Care for conditions of the brain, spine and nervous system.",
    },
    {
      name: "Dr. Nadia Sultana",
      department: "Pediatrics",
      specialty: "Child health specialist",
      qualifications: "MBBS, DCH, FCPS (Pediatrics)",
      experience: 9,
      fee: 1000,
      room: "104",
      location: "1st floor",
      description: "Thoughtful care for children at every stage of growing up.",
    },
    {
      name: "Dr. Rezaul Karim",
      department: "Orthopedics",
      specialty: "Orthopedic surgeon",
      qualifications: "MBBS, MS (Orthopedics)",
      experience: 16,
      fee: 1300,
      room: "203",
      location: "2nd floor",
      description: "Specialist care for your bones, joints and mobility.",
    },
    {
      name: "Dr. Sara Islam",
      department: "Dermatology",
      specialty: "Dermatologist",
      qualifications: "MBBS, DDV",
      experience: 8,
      fee: 900,
      room: "105",
      location: "1st floor",
      description: "Care for skin, hair and nail conditions.",
    },
    {
      name: "Dr. Imran Hasan",
      department: "General Medicine",
      specialty: "Medicine specialist",
      qualifications: "MBBS, FCPS (Medicine)",
      experience: 12,
      fee: 800,
      room: "106",
      location: "1st floor",
      description: "General consultations and ongoing health management.",
    },
  ];
  let credentials =
    "# Local development sample accounts\n\nFictional test identities. Never use with real patient data. Credentials are generated only for new accounts.\n\n";
  try {
    for (let i = 0; i < people.length + 2; i++) {
      const person = people[i];
      const role = person
        ? Role.DOCTOR
        : i === people.length
          ? Role.ADMIN
          : Role.RECEPTIONIST;
      const email = person
        ? `doctor${i + 1}@smartcare.example`
        : `${role.toLowerCase()}@smartcare.example`;
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        const password = randomBytes(18).toString("base64url");
        user = await db.user.create({
          data: {
            name: person?.name ?? `Demo ${role.toLowerCase()}`,
            email,
            phone: `+88019900000${String(i).padStart(2, "0")}`,
            passwordHash: await passwords.hash(password),
            role,
          },
        });
        credentials += `- ${role}: ${email} / ${password}\n`;
      }
      if (person) {
        const department = await db.department.upsert({
          where: { name: person.department },
          create: {
            name: person.department,
            description: person.description,
            location: person.location,
          },
          update: {},
        });
        const doctor = await db.doctor.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            departmentId: department.id,
            qualification: person.qualifications,
            specialization: person.specialty,
            experience: person.experience,
            consultationFee: person.fee,
            roomNumber: person.room,
          },
          update: {},
        });
        for (const day of [0, 1, 2, 3, 4, 5, 6])
          await db.schedule.upsert({
            where: { doctorId_day: { doctorId: doctor.id, day } },
            create: {
              doctorId: doctor.id,
              day,
              startTime: "09:00",
              endTime: "21:00",
              maximumPatients: 30,
            },
            update: {},
          });
      }
    }
    if (credentials.includes(" / ")) {
      await mkdir("../.local", { recursive: true });
      await writeFile("../.local/demo-accounts.md", credentials, {
        mode: 0o600,
        flag: "a",
      });
    }
    console.log(
      "Fictional directory ready. New account credentials are saved in .local/demo-accounts.md (gitignored).",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Demo seed failed. Check database configuration and explicit SEED_DEMO opt-in.",
  );
  process.exitCode = 1;
});
