"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, MapPin, RefreshCw } from "lucide-react";
import { api, apiItems, Appointment, Doctor, Queue, today } from "@/services/api";
import { Access } from "@/components/access";
import { Empty, ErrorMessage, Loading, PageHeading } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
function QueueContent() {
  const params = useSearchParams();
  const [chosen, setChosen] = useState(params.get("doctor") ?? "");
  const [date, setDate] = useState(params.get("date") ?? today());
  const doctors = useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiItems<Doctor>("doctors"),
  });
  const appointments = useQuery({
    queryKey: ["appointments"],
    queryFn: () => apiItems<Appointment>("appointments"),
  });
  const id =
    chosen ||
    appointments.data?.find((a) => ["WAITING", "CALLED"].includes(a.status))
      ?.doctor.id ||
    doctors.data?.[0]?.id ||
    "";
  const queue = useQuery({
    queryKey: ["queue", id, date],
    queryFn: () => api<Queue>(`queue/${id}?date=${date}`),
    enabled: !!id && !!date,
    refetchInterval: 10000,
  });
  const doctor = doctors.data?.find((d) => d.id === id);
  return (
    <>
      <PageHeading
        eyebrow="LESS WAITING, MORE LIVING"
        title="Follow your queue"
        description="See your place in line without staying at the reception desk."
      />
      <div className="queue-controls">
        <div>
          <Label>Doctor</Label>
          <Select value={id} onValueChange={setChosen}>
            <SelectTrigger aria-label="Choose doctor">
              <SelectValue placeholder="Choose a doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="queue-date">Visit date</Label>
          <Input
            id="queue-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <ErrorMessage
        error={queue.error || doctors.error || appointments.error}
      />
      {!id ? (
        <Empty
          title="Choose your care team"
          text="A queue will appear when a doctor is available."
        />
      ) : queue.isPending ? (
        <Loading />
      ) : (
        queue.data && (
          <>
            <div className="queue-board">
              <div className="queue-board-heading">
                <span>
                  <Activity size={17} />
                  QUEUE STATUS
                </span>
                <span>
                  <span className="tiny-dot" />
                  Updates every 10 seconds
                </span>
              </div>
              <p>Now consulting</p>
              <strong className="queue-number">
                {queue.data.current
                  ? String(queue.data.current).padStart(2, "0")
                  : "—"}
              </strong>
              <h2>{doctor?.user.name}</h2>
              <p>
                <MapPin size={16} />
                Room {doctor?.roomNumber} · {doctor?.department.name}
              </p>
              <div className="queue-board-bottom">
                <div>
                  <span>Up next</span>
                  <strong>{queue.data.next ?? "—"}</strong>
                </div>
                <div>
                  <span>Waiting</span>
                  <strong>{queue.data.waiting}</strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{queue.data.completed}</strong>
                </div>
              </div>
            </div>
            <div className="queue-personal">
              <Card>
                <CardContent>
                  <span className="eyebrow">YOUR PLACE IN LINE</span>
                  <h2>
                    {queue.data.ownSerial
                      ? `Serial #${queue.data.ownSerial}`
                      : "No appointment in this queue"}
                  </h2>
                  <p>
                    {queue.data.ownSerial === queue.data.current
                      ? "It’s your turn. Please go to the consultation room."
                      : queue.data.ahead !== null
                        ? `${queue.data.ahead} patient${queue.data.ahead === 1 ? "" : "s"} ahead of you. Keep this page open for updates.`
                        : "Your serial will appear here after you book."}
                  </p>
                </CardContent>
              </Card>
              <div className="queue-note">
                <RefreshCw size={18} />
                <p>
                  Consultation lengths vary. The queue reflects the latest
                  update from hospital staff.
                </p>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
export default function QueuePage() {
  return (
    <Access>
      <Suspense fallback={<Loading />}>
        <QueueContent />
      </Suspense>
    </Access>
  );
}
