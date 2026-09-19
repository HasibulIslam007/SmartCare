export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      Array.isArray(body.message)
        ? body.message.join(". ")
        : (body.message ?? "Something went wrong"),
      response.status,
    );
  return body.data as T;
}
export function send<T>(path: string, data: unknown, method = "POST") {
  return api<T>(path, { method, body: JSON.stringify(data) });
}
export type Role = "PATIENT" | "DOCTOR" | "RECEPTIONIST" | "ADMIN";
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
}
export interface Department {
  id: string;
  name: string;
  description: string;
  location: string;
  _count: { doctors: number };
}
export interface Schedule {
  day: number;
  startTime: string;
  endTime: string;
  maximumPatients: number;
}
export interface Doctor {
  id: string;
  userId: string;
  user: { id: string; name: string };
  department: Department;
  qualification: string;
  specialization: string;
  experience: number;
  consultationFee: number;
  roomNumber: string;
  schedules: Schedule[];
}
export interface Medicine {
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
}
export interface MedicalRecord {
  id: string;
  notes: string;
  diagnosis: string;
  advice: string;
  followUp: string | null;
  medicines: Medicine[];
  createdAt: string;
}
export interface Appointment {
  id: string;
  date: string;
  doctor: Doctor;
  patient: { id: string; name: string };
  serialNumber: number;
  status: "WAITING" | "CALLED" | "COMPLETED" | "CANCELLED";
  reason: string;
  record?: MedicalRecord | null;
}
export interface Queue {
  current: number | null;
  next: number | null;
  waiting: number;
  completed: number;
  ownSerial: number | null;
  ahead: number | null;
}
export type ReportType =
  | "BLOOD_TEST"
  | "XRAY"
  | "MRI"
  | "CT_SCAN"
  | "ULTRASOUND"
  | "PRESCRIPTION"
  | "DISCHARGE_SUMMARY"
  | "OTHER";
export interface MedicalReport {
  id: string;
  patientId: string;
  title: string;
  reportType: ReportType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}
export interface ReportsPage {
  reports: MedicalReport[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export function reportTypeLabel(type: ReportType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dateLabel(date: string) {
  return new Date(date.slice(0, 10) + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
