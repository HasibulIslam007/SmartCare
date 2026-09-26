"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  apiItems,
  send,
  Appointment,
  Doctor,
  User,
  today,
  days,
} from "@/services/api";
import { useSession } from "@/hooks/use-session";
import { Access } from "@/components/access";
import {
  Empty,
  ErrorMessage,
  PageHeading,
  Status,
  Submit,
  Loading,
} from "@/components/shared";
import { ReportList } from "@/components/report-list";
import { ReportsPage } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsultationForm } from "@/components/consultation-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
function Content() {
  const { data: user } = useSession();
  const client = useQueryClient();
  const [doctorId, setDoctorId] = useState("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const doctors = useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiItems<Doctor>("doctors"),
  });
  const q = useQuery({
    queryKey: ["appointments"],
    queryFn: () => apiItems<Appointment>("appointments"),
    refetchInterval: 10000,
  });
  const patients = useQuery({
    queryKey: ["patients"],
    queryFn: () => apiItems<User>("patients"),
    enabled: user?.role !== "DOCTOR",
  });
  const available = doctors.data?.filter(
    (d) => user?.role !== "DOCTOR" || d.userId === user.id,
  );
  const id = doctorId || available?.[0]?.id || "";
  const doctor = available?.find((d) => d.id === id);
  const appointments = q.data?.filter(
    (a) => a.doctor.id === id && a.date.slice(0, 10) === today(),
  );
  const patientReports = useQuery({
    queryKey: ["reports"],
    queryFn: () => api<ReportsPage>("reports"),
    enabled: user?.role === "DOCTOR" && !!selected,
  });
  const current = appointments?.find((a) => a.status === "CALLED");
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["appointments"] });
  const next = useMutation({
    mutationFn: () => send(`queue/${id}/next`, { date: today() }),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: (aid: string) =>
      send(`appointments/${aid}/complete`, {}, "PATCH"),
    onSuccess: refresh,
  });
  const book = useMutation({
    mutationFn: (data: unknown) => send("appointments", data),
    onSuccess: refresh,
  });
  const record = useMutation({
    mutationFn: (data: unknown) =>
      send(`appointments/${selected?.id}/record`, data, "PUT"),
    onSuccess: () => {
      refresh();
      setSelected(null);
    },
  });
  const schedule = useMutation({
    mutationFn: (data: unknown) => send(`doctors/${id}/schedules`, data, "PUT"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["doctors"] }),
  });
  return (
    <>
      <PageHeading
        eyebrow="CONNECTED CARE TEAM"
        title="Care workspace"
        description="Manage today’s patient flow and keep every consultation connected."
      />
      <div className="queue-controls">
        <div>
          <Label htmlFor="workspace-doctor">Consulting doctor</Label>
          <select
            id="workspace-doctor"
            value={id}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="" disabled>
              Select a doctor
            </option>
            {available?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          disabled={!id || next.isPending || !!current}
          onClick={() => next.mutate()}
        >
          Call next patient
        </Button>
      </div>
      <ErrorMessage
        error={q.error || doctors.error || next.error || complete.error}
      />
      {current && (
        <div className="consulting-banner">
          <div>
            <span className="eyebrow">
              NOW CONSULTING · SERIAL #{current.serialNumber}
            </span>
            <h2>{current.patient.name}</h2>
            <p>{current.reason}</p>
          </div>
          <div className="row-actions">
            {user?.role === "DOCTOR" && (
              <Button onClick={() => setSelected(current)}>
                Write consultation
              </Button>
            )}
            <Button
              variant="outline"
              disabled={complete.isPending}
              onClick={() => complete.mutate(current.id)}
            >
              Complete visit
            </Button>
          </div>
        </div>
      )}
      {q.isPending ? (
        <Loading />
      ) : appointments?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Serial</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Visit reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>#{a.serialNumber}</td>
                  <td>{a.patient.name}</td>
                  <td>
                    <Status status={a.status} />
                  </td>
                  <td>{a.reason}</td>
                  <td>
                    {user?.role === "DOCTOR" &&
                      ["CALLED", "COMPLETED"].includes(a.status) && (
                        <Button variant="ghost" onClick={() => setSelected(a)}>
                          {a.record ? "Edit record" : "Write record"}
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="A clear waiting room"
          text="Today’s appointments for this doctor will appear here."
        />
      )}
      <div className="workspace-grid">
        {user?.role !== "DOCTOR" && (
          <Card>
            <CardHeader>
              <CardTitle>Book for a patient</CardTitle>
              <p className="muted">The patient needs a registered account.</p>
            </CardHeader>
            <CardContent>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  book.mutate({
                    ...Object.fromEntries(new FormData(e.currentTarget)),
                    doctorId: id,
                  });
                }}
              >
                <div>
                  <Label htmlFor="patient">Patient</Label>
                  <select
                    id="patient"
                    name="patientId"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a patient
                    </option>
                    {patients.data?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="staff-date">Visit date</Label>
                  <Input
                    id="staff-date"
                    name="date"
                    type="date"
                    defaultValue={today()}
                    min={today()}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="staff-reason">Visit reason</Label>
                  <Input
                    id="staff-reason"
                    name="reason"
                    minLength={3}
                    maxLength={500}
                    required
                  />
                </div>
                <ErrorMessage error={book.error || patients.error} />
                {book.isSuccess && (
                  <p role="status" className="success-message">
                    Appointment booked. View it in Appointments.
                  </p>
                )}
                <Submit pending={book.isPending}>Book appointment</Submit>
              </form>
            </CardContent>
          </Card>
        )}
        {user?.role !== "RECEPTIONIST" && id && (
          <Card>
            <CardHeader>
              <CardTitle>Weekly visiting schedule</CardTitle>
              <p className="muted">
                Update one weekday for {doctor?.user.name}.
              </p>
            </CardHeader>
            <CardContent>
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = Object.fromEntries(
                    new FormData(e.currentTarget),
                  );
                  schedule.mutate({
                    ...data,
                    day: Number(data.day),
                    maximumPatients: Number(data.maximumPatients),
                  });
                }}
              >
                <div>
                  <Label htmlFor="weekday">Weekday</Label>
                  <select id="weekday" name="day">
                    {days.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-grid">
                  <div>
                    <Label htmlFor="start-time">Start time</Label>
                    <Input
                      id="start-time"
                      name="startTime"
                      type="time"
                      required
                      defaultValue="09:00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End time</Label>
                    <Input
                      id="end-time"
                      name="endTime"
                      type="time"
                      required
                      defaultValue="17:00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="capacity">Maximum patients</Label>
                  <Input
                    id="capacity"
                    name="maximumPatients"
                    type="number"
                    min={1}
                    max={200}
                    defaultValue={20}
                    required
                  />
                </div>
                <ErrorMessage error={schedule.error} />
                {schedule.isSuccess && (
                  <p role="status" className="success-message">
                    Schedule updated.
                  </p>
                )}
                <Submit pending={schedule.isPending}>Save schedule</Submit>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="consultation-dialog">
          <DialogHeader>
            <DialogTitle>Consultation · {selected?.patient.name}</DialogTitle>
            <DialogDescription>
              Record your clinical findings and prescription for this visit.
            </DialogDescription>
          </DialogHeader>
          {selected && <ConsultationForm key={selected.id} appointment={selected} save={data => record.mutate(data)} pending={record.isPending} error={record.error} />}
        </DialogContent>
      </Dialog>
      {user?.role === "DOCTOR" && selected && (
        <section className="workspace-reports">
          <div className="section-title">
            <div>
              <span className="eyebrow">PATIENT DOCUMENTS</span>
              <h2>{selected.patient.name}&apos;s reports</h2>
            </div>
          </div>
          <ReportList
            reports={patientReports.data?.reports.filter((report) => report.patientId === selected.patient.id)}
            isPending={patientReports.isPending}
            error={patientReports.error}
            emptyTitle="No reports for this patient yet."
            emptyText="Uploaded medical reports will appear here after they are added to the patient record."
          />
        </section>
      )}
    </>
  );
}
export default function Workspace() {
  return (
    <Access roles={["DOCTOR", "RECEPTIONIST", "ADMIN"]}>
      <Content />
    </Access>
  );
}
