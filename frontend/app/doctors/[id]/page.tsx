"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  send,
  Doctor,
  Appointment,
  Schedule,
  days,
  today,
  dateLabel,
} from "@/services/api";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorMessage, Initials, Loading, Submit } from "@/components/shared";
export default function DoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: user } = useSession();
  const client = useQueryClient();
  const [date, setDate] = useState(today());
  const doctor = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => api<Doctor>(`doctors/${id}`),
  });
  const availability = useQuery({
    queryKey: ["availability", id, date],
    queryFn: () =>
      api<{ remaining: number; schedule: Schedule | null }>(
        `doctors/${id}/availability?date=${date}`,
      ),
    enabled: !!date,
  });
  const booking = useMutation({
    mutationFn: (reason: string) =>
      send<Appointment>("appointments", { doctorId: id, date, reason }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["appointments"] });
      client.invalidateQueries({ queryKey: ["availability"] });
    },
  });
  if (doctor.isPending) return <Loading />;
  if (doctor.error) return <ErrorMessage error={doctor.error} />;
  const d = doctor.data!;
  return (
    <>
      <Link href="/doctors" className="back-link">
        <ArrowLeft size={16} />
        All specialists
      </Link>
      <div className="detail-grid">
        <Card>
          <CardContent className="doctor-profile">
            <Initials name={d.user.name} large />
            <span className="specialty-tag">{d.department.name}</span>
            <h1>{d.user.name}</h1>
            <p className="lead">{d.specialization}</p>
            <p>{d.qualification}</p>
            <div className="profile-facts">
              <span>
                <Clock3 size={18} />
                {d.experience} years of experience
              </span>
              <span>
                <MapPin size={18} />
                Room {d.roomNumber} · {d.department.location}
              </span>
            </div>
            <hr />
            <h3>Visiting hours</h3>
            <p className="muted">
              All times are in Bangladesh time (Asia/Dhaka).
            </p>
            <div className="schedule-list">
              {d.schedules.map((s) => (
                <div key={s.day}>
                  <strong>{days[s.day]}</strong>
                  <span>
                    {s.startTime} – {s.endTime}
                  </span>
                  <small>{s.maximumPatients} patients</small>
                </div>
              ))}
            </div>
            <hr />
            <div className="fee-row">
              <span>Consultation fee</span>
              <strong>৳{d.consultationFee.toLocaleString()}</strong>
            </div>
          </CardContent>
        </Card>
        <Card className="booking-card">
          <CardHeader>
            <CardTitle>Make time for better health</CardTitle>
            <p className="muted">
              Choose your visit date. We’ll take care of your serial.
            </p>
          </CardHeader>
          <CardContent>
            {booking.data ? (
              <div className="booking-success" role="status">
                <CheckCircle2 size={44} />
                <h2>You’re booked!</h2>
                <p>
                  {dateLabel(booking.data.date)} · {d.user.name}
                </p>
                <div className="serial-ticket">
                  <span>YOUR SERIAL NUMBER</span>
                  <strong>
                    {String(booking.data.serialNumber).padStart(2, "0")}
                  </strong>
                  <small>Room {d.roomNumber}</small>
                </div>
                <Button asChild>
                  <Link href="/appointments">View my appointment</Link>
                </Button>
              </div>
            ) : (
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  booking.mutate(
                    String(new FormData(e.currentTarget).get("reason")),
                  );
                }}
              >
                <div>
                  <Label htmlFor="date">Visit date</Label>
                  <Input
                    id="date"
                    type="date"
                    min={today()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                {availability.data && (
                  <div
                    className={
                      availability.data.remaining
                        ? "availability-note"
                        : "error-message"
                    }
                  >
                    {availability.data.schedule
                      ? `${availability.data.remaining} places remaining · ${availability.data.schedule.startTime}–${availability.data.schedule.endTime}`
                      : "No visiting hours on this day. Please choose another date."}
                  </div>
                )}
                <ErrorMessage error={availability.error} />
                <div>
                  <Label htmlFor="reason">Reason for your visit</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    placeholder="Briefly tell your doctor why you’re visiting…"
                    minLength={3}
                    maxLength={500}
                    required
                  />
                </div>
                <ErrorMessage error={booking.error} />
                {!user ? (
                  <Button asChild>
                    <Link href="/login">Sign in to book</Link>
                  </Button>
                ) : user.role === "PATIENT" ? (
                  <Button
                    type="submit"
                    disabled={
                      booking.isPending || !availability.data?.remaining
                    }
                  >
                    {booking.isPending
                      ? "Booking your visit…"
                      : "Confirm appointment"}
                  </Button>
                ) : (
                  <p className="muted">
                    Staff can book for patients in the care workspace.
                  </p>
                )}
                <p className="booking-fineprint">
                  <ShieldCheck size={16} />
                  Your serial is assigned when your booking is confirmed. Pay
                  the consultation fee at the hospital.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
