"use client";
import { useQuery } from "@tanstack/react-query";
import { Access } from "@/components/access";
import { ReportList } from "@/components/report-list";
import { PageHeading } from "@/components/shared";
import { api, ReportsPage } from "@/services/api";

function Content() {
  const reports = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<ReportsPage>("reports"),
  });
  return (
    <>
      <PageHeading eyebrow="YOUR HEALTH STORY" title="Medical reports" description="Secure laboratory files and documents from your care team." />
      <ReportList reports={reports.data?.reports} isPending={reports.isPending} error={reports.error} />
    </>
  );
}

export default function Reports() {
  return <Access roles={["PATIENT"]}><Content /></Access>;
}