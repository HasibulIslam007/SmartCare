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
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export async function apiItems<T>(path: string): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const result = await api<Paginated<T>>(`${path}${separator}pageSize=100`);
  return result.items;
}
export function send<T>(path: string, data: unknown, method = "POST") {
  return api<T>(path, { method, body: JSON.stringify(data) });
}
export async function upload<T>(path: string, data: FormData): Promise<T> {
  const response = await fetch(`/api/${path}`, { method: "POST", body: data });
  const body = await response.json();
  if (!response.ok) throw new ApiError(Array.isArray(body.message) ? body.message.join(". ") : (body.message ?? "Upload failed"), response.status);
  return body.data as T;
}
export type Role = "PATIENT" | "DOCTOR" | "RECEPTIONIST" | "ADMIN";
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  emailVerifiedAt?: string | null;
}
export interface Session {
  user: User;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
/** Returned by auth/login instead of a session when two-factor is enabled. */
export interface MfaChallenge {
  mfaRequired: true;
  challengeToken: string;
}
export type LoginResponse = Session | MfaChallenge;
export function isMfaChallenge(value: LoginResponse): value is MfaChallenge {
  return "mfaRequired" in value && value.mfaRequired === true;
}
export interface MfaStatus {
  enabled: boolean;
  pendingSetup: boolean;
  recoveryCodesRemaining: number;
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
  prescriptionFile?: { id: string; fileName: string; fileSize: number; createdAt: string } | null;
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
export interface ReportShare {
  id: string;
  expiresAt: string;
  maxDownloads: number | null;
  downloadCount: number;
  revokedAt: string | null;
  createdAt: string;
  token?: string;
}
export type NotificationType = "APPOINTMENT_REMINDER" | "QUEUE_UPDATE" | "REPORT_READY" | "PRESCRIPTION_READY" | "SYSTEM";
export interface Notification { id: string; title: string; message: string; type: NotificationType; read: boolean; createdAt: string; }
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
