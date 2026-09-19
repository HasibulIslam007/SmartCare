"use client";
import { AlertCircle, LoaderCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Loading() {
  return (
    <div className="empty-state" role="status">
      <LoaderCircle className="animate-spin" />
      <p>Loading your care…</p>
    </div>
  );
}
export function ErrorMessage({ error }: { error: unknown }) {
  return error ? (
    <div className="error-message" role="alert">
      <AlertCircle size={18} />
      <span>{error instanceof Error ? error.message : String(error)}</span>
    </div>
  ) : null;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span />
      {status.toLowerCase().replace("_", " ")}
    </span>
  );
}
export function Submit({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <LoaderCircle className="animate-spin" size={16} />}
      {pending ? "Please wait…" : children}
    </Button>
  );
}
export function Initials({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span className={`initials ${large ? "large" : ""}`}>
      {name
        .replace(/^Dr\.?\s*/i, "")
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")}
    </span>
  );
}
