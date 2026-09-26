"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { MedicalReport, ReportType, reportTypeLabel, upload } from "@/services/api";
import { ErrorMessage, Submit } from "./shared";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const reportTypes: ReportType[] = ["BLOOD_TEST", "XRAY", "MRI", "CT_SCAN", "ULTRASOUND", "PRESCRIPTION", "DISCHARGE_SUMMARY", "OTHER"];

export function ReportUploadForm({ patientId, patientName }: { patientId: string; patientName: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (form: FormData) => upload<MedicalReport>("reports", form), onSuccess: () => { formRef.current?.reset(); client.invalidateQueries({ queryKey: ["reports"] }); } });
  return <form ref={formRef} className="form-stack" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); data.set("patientId", patientId); mutation.mutate(data); }}>
    <p className="muted">Upload a private report for {patientName}. PDF, JPEG, or PNG; maximum 10 MB.</p>
    <div><Label htmlFor="report-title">Report title</Label><Input id="report-title" name="title" minLength={1} maxLength={200} required /></div>
    <div><Label htmlFor="report-type">Report type</Label><select id="report-type" name="reportType" defaultValue="BLOOD_TEST">{reportTypes.map((type) => <option key={type} value={type}>{reportTypeLabel(type)}</option>)}</select></div>
    <div><Label htmlFor="report-description">Description</Label><Textarea id="report-description" name="description" maxLength={2000} /></div>
    <div><Label htmlFor="report-file">Medical file</Label><Input id="report-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /></div>
    {mutation.isPending ? <progress className="w-full" aria-label="Uploading report" /> : null}
    {mutation.isSuccess ? <p role="status" className="success-message">Report uploaded securely.</p> : null}
    <ErrorMessage error={mutation.error} /><Submit pending={mutation.isPending}>Upload report</Submit>
  </form>;
}
