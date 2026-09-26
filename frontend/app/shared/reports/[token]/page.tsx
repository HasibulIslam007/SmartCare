"use client";
import { useParams } from "next/navigation";
import { PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  return <main className="mx-auto max-w-xl p-6"><PageHeading eyebrow="SECURE DOCUMENT" title="Shared medical report" description="This private link may expire or have a download limit. Enter the passcode if the patient supplied one." />
    <form className="form-stack" onSubmit={(event) => { event.preventDefault(); const passcode = String(new FormData(event.currentTarget).get("passcode") ?? ""); const query = passcode ? `?passcode=${encodeURIComponent(passcode)}` : ""; window.open(`/api/reports/shared/${encodeURIComponent(token)}${query}`, "_blank", "noopener,noreferrer"); }}>
      <div><Label htmlFor="share-passcode">Passcode</Label><Input id="share-passcode" name="passcode" inputMode="numeric" pattern="[0-9]{4,12}" placeholder="Only if required" /></div>
      <Button type="submit">Open report</Button>
    </form>
  </main>;
}
