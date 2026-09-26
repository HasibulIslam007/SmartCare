"use client";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { api, Appointment, dateLabel } from "@/services/api";
import { Access } from "@/components/access";
import { Empty, ErrorMessage, Loading, PageHeading } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
function Content() {
  const download = async (id: string) => {
    const result = await api<{ url: string }>(`prescriptions/${id}/download`);
    window.open(result.url, "_blank", "noopener,noreferrer");
  };
  const q = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api<Appointment[]>("appointments"),
  });
  const records = q.data?.filter((a) => a.record);
  return (
    <>
      <PageHeading
        eyebrow="YOUR HEALTH STORY"
        title="Medical records"
        description="Consultation notes and prescriptions from your treating doctors."
      />
      <ErrorMessage error={q.error} />
      {q.isPending ? (
        <Loading />
      ) : records?.length ? (
        <div className="record-list">
          {records.map((a) => (
            <Card key={a.id} className="record-card">
              <CardContent>
                <div className="section-title">
                  <div>
                    <p className="eyebrow">{dateLabel(a.date)}</p>
                    <h2>{a.doctor.user.name}</h2>
                    <p>{a.doctor.department.name}</p>
                  </div>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer size={16} />
                    Print records / save PDF
                  </Button>
                  {a.record!.prescriptionFile && (
                    <Button variant="outline" onClick={() => download(a.record!.prescriptionFile!.id)}>
                      <Download size={16} />
                      Download prescription PDF
                    </Button>
                  )}
                </div>
                <h3>Consultation</h3>
                <p>{a.record!.notes}</p>
                <h3>Diagnosis</h3>
                <p>{a.record!.diagnosis}</p>
                {a.record!.medicines.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dose</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.record!.medicines.map((m, i) => (
                          <tr key={i}>
                            <td>{m.medicine}</td>
                            <td>{m.dose}</td>
                            <td>{m.frequency}</td>
                            <td>{m.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <h3>Advice</h3>
                <p>{a.record!.advice || "No additional advice recorded."}</p>
                {a.record!.followUp && (
                  <p>
                    <strong>Follow-up:</strong> {dateLabel(a.record!.followUp)}
                  </p>
                )}
                <small>Consult your doctor for medical decisions.</small>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="Your records, together at last"
          text="After a consultation, your doctor’s notes and prescriptions will appear here."
        />
      )}
      <div className="feature-note">
        <strong>Report uploads are in the next milestone.</strong>
        <p>
          This page currently contains consultation records and prescriptions.
          Laboratory files and secure sharing still need the storage
          integration.
        </p>
      </div>
    </>
  );
}
export default function Records() {
  return (
    <Access roles={["PATIENT"]}>
      <Content />
    </Access>
  );
}
