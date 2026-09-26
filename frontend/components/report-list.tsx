"use client";
import { Download, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, dateLabel, MedicalReport, reportTypeLabel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorMessage, Loading, Empty } from "@/components/shared";

export function ReportList({ reports, isPending, error, emptyTitle = "No medical reports yet.", emptyText = "Your uploaded reports will appear here." }: {
  reports: MedicalReport[] | undefined;
  isPending: boolean;
  error: unknown;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const download = useMutation({
    mutationFn: (id: string) => api<{ url: string; expiresIn: number }>(`reports/${id}/download`),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorMessage error={error} />;
  if (!reports?.length) return <Empty title={emptyTitle} text={emptyText} />;
  return (
    <div className="report-list">
      {reports.map((report) => (
        <Card key={report.id} className="report-card">
          <CardContent>
            <span className="report-icon"><FileText size={20} /></span>
            <div className="report-detail">
              <p className="eyebrow">{reportTypeLabel(report.reportType)}</p>
              <h3>{report.title}</h3>
              <p>{dateLabel(report.createdAt)} · {report.fileName}</p>
              {report.description && <small>{report.description}</small>}
            </div>
            <Button variant="outline" onClick={() => download.mutate(report.id)} disabled={download.isPending}>
              <Download size={15} />
              {download.isPending ? "Opening…" : "Download"}
            </Button>
          </CardContent>
        </Card>
      ))}
      <ErrorMessage error={download.error} />
    </div>
  );
}