"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Access } from "@/components/access";
import { ReportList } from "@/components/report-list";
import { PageHeading } from "@/components/shared";
import { api, ReportsPage, ReportType, reportTypeLabel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const types: ReportType[] = ["BLOOD_TEST", "XRAY", "MRI", "CT_SCAN", "ULTRASOUND", "PRESCRIPTION", "DISCHARGE_SUMMARY", "OTHER"];

function Content() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const search = new URLSearchParams({ page: String(page), pageSize: "10", ...(type ? { type } : {}), ...(status ? { status } : {}) });
  const reports = useQuery({ queryKey: ["reports", page, type, status], queryFn: () => api<ReportsPage>(`reports?${search}`) });
  const pages = reports.data?.pagination.totalPages ?? 0;
  return <>
    <PageHeading eyebrow="YOUR HEALTH STORY" title="Medical reports" description="Preview, download, and securely share laboratory files from your care team." />
    <div className="queue-controls">
      <div><Label htmlFor="report-type-filter">Report type</Label><select id="report-type-filter" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="">All types</option>{types.map((value) => <option key={value} value={value}>{reportTypeLabel(value)}</option>)}</select></div>
      <div><Label htmlFor="report-status-filter">Status</Label><select id="report-status-filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option><option value="">All</option></select></div>
    </div>
    <ReportList reports={reports.data?.reports} isPending={reports.isPending} error={reports.error} />
    {pages > 1 ? <nav className="row-actions" aria-label="Report pages"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav> : null}
  </>;
}

export default function Reports() { return <Access roles={["PATIENT"]}><Content /></Access>; }
