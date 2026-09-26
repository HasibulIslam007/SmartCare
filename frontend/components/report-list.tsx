"use client";
import { Archive, Download, Eye, FileText, Link2, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, dateLabel, MedicalReport, ReportShare, reportTypeLabel, send } from "@/services/api";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage, Loading, Empty } from "@/components/shared";

function ShareReport({ report }: { report: MedicalReport }) {
  const [link, setLink] = useState("");
  const [passcodeRequired, setPasscodeRequired] = useState(false);
  const client = useQueryClient();
  const shares = useQuery({ queryKey: ["report-shares", report.id], queryFn: () => api<ReportShare[]>(`reports/${report.id}/shares`) });
  const share = useMutation({
    mutationFn: (data: { expiresInDays: number; maxDownloads?: number; passcode?: string }) => send<ReportShare>(`reports/${report.id}/shares`, data),
    onSuccess: (result) => { setLink(`${window.location.origin}/shared/reports/${result.token}`); client.invalidateQueries({ queryKey: ["report-shares", report.id] }); },
  });
  const revoke = useMutation({ mutationFn: (id: string) => send(`reports/${report.id}/shares/${id}/revoke`, {}, "PATCH"), onSuccess: () => client.invalidateQueries({ queryKey: ["report-shares", report.id] }) });
  return <details><summary className="cursor-pointer text-sm font-medium">Share securely</summary>
    <form className="mt-3 grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      setPasscodeRequired(Boolean(values.passcode));
      share.mutate({ expiresInDays: Number(values.expiresInDays), ...(values.maxDownloads ? { maxDownloads: Number(values.maxDownloads) } : {}), ...(values.passcode ? { passcode: String(values.passcode) } : {}) });
    }}>
      <div className="form-grid">
        <div><Label htmlFor={`expiry-${report.id}`}>Expires in days</Label><Input id={`expiry-${report.id}`} name="expiresInDays" type="number" min={1} max={30} defaultValue={7} required /></div>
        <div><Label htmlFor={`limit-${report.id}`}>Download limit</Label><Input id={`limit-${report.id}`} name="maxDownloads" type="number" min={1} max={100} placeholder="No limit" /></div>
      </div>
      <div><Label htmlFor={`passcode-${report.id}`}>Optional numeric passcode</Label><Input id={`passcode-${report.id}`} name="passcode" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} /></div>
      <Button type="submit" variant="outline" disabled={share.isPending}><Link2 size={15} />{share.isPending ? "Creating…" : "Create link"}</Button>
      {link ? <div><Label htmlFor={`link-${report.id}`}>Share link</Label><Input id={`link-${report.id}`} readOnly value={link} onFocus={(event) => event.currentTarget.select()} /><small>{passcodeRequired ? "Send the passcode separately from the link." : "Anyone with this link can open the report until it expires."}</small></div> : null}
      <ErrorMessage error={share.error} />
      {shares.data?.filter((item) => !item.revokedAt).map((item) => <div className="row-actions" key={item.id}><small>Expires {dateLabel(item.expiresAt)} · {item.downloadCount}/{item.maxDownloads ?? "∞"} downloads</small><Button type="button" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(item.id)}>Revoke</Button></div>)}
      <ErrorMessage error={shares.error || revoke.error} />
    </form>
  </details>;
}

export function ReportList({ reports, isPending, error, canManage = false, emptyTitle = "No medical reports yet.", emptyText = "Your uploaded reports will appear here." }: {
  reports: MedicalReport[] | undefined; isPending: boolean; error: unknown; canManage?: boolean; emptyTitle?: string; emptyText?: string;
}) {
  const { data: user } = useSession();
  const client = useQueryClient();
  const status = useMutation({
    mutationFn: ({ id, next }: { id: string; next: MedicalReport["status"] }) => send(`reports/${id}/status`, { status: next }, "PATCH"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["reports"] }),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!reports?.length) return <Empty title={emptyTitle} text={emptyText} />;
  return <div className="report-list">
    {reports.map((report) => <Card key={report.id} className="report-card"><CardContent>
      <span className="report-icon"><FileText size={20} /></span>
      <div className="report-detail"><p className="eyebrow">{reportTypeLabel(report.reportType)} · {report.status}</p><h3>{report.title}</h3><p>{dateLabel(report.createdAt)} · {report.fileName} · {(report.fileSize / 1024).toFixed(1)} KB</p>{report.description ? <small>{report.description}</small> : null}{user?.role === "PATIENT" && report.status === "ACTIVE" ? <ShareReport report={report} /> : null}</div>
      <div className="row-actions">
        <Button variant="outline" asChild><a href={`/api/reports/${report.id}/content`} target="_blank" rel="noreferrer"><Eye size={15} />Preview</a></Button>
        <Button variant="outline" asChild><a href={`/api/reports/${report.id}/content`} download><Download size={15} />Download</a></Button>
        {canManage ? <Button variant="ghost" disabled={status.isPending} onClick={() => status.mutate({ id: report.id, next: report.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" })}>{report.status === "ACTIVE" ? <Archive size={15} /> : <RotateCcw size={15} />}{report.status === "ACTIVE" ? "Archive" : "Restore"}</Button> : null}
      </div>
    </CardContent></Card>)}
    <ErrorMessage error={status.error} />
  </div>;
}
