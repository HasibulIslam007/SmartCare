"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { api, send, Appointment, dateLabel } from "@/services/api";
import { useSession } from "@/hooks/use-session";
import { Access } from "@/components/access";
import {
  Empty,
  ErrorMessage,
  Initials,
  Loading,
  PageHeading,
  Status,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
function AppointmentsContent() {
  const { data: user } = useSession();
  const client = useQueryClient();
  const [tab, setTab] = useState("upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api<Appointment[]>("appointments"),
    refetchInterval: 15000,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => send(`appointments/${id}/cancel`, {}, "PATCH"),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["appointments"] });
      client.invalidateQueries({ queryKey: ["queue"] });
      setCancelId(null);
    },
  });
  const filtered = query.data?.filter((a) =>
    tab === "upcoming"
      ? ["WAITING", "CALLED"].includes(a.status)
      : ["COMPLETED", "CANCELLED"].includes(a.status),
  );
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT STEP"
        title="Appointments"
        description="A clear view of your visits, from booking to follow-up."
      >
        <Button asChild>
          <Link href="/doctors">
            <Plus size={17} />
            Book a visit
          </Link>
        </Button>
      </PageHeading>
      <div className="filter-chips">
        <Button
          variant={tab === "upcoming" ? "default" : "outline"}
          onClick={() => setTab("upcoming")}
        >
          Upcoming visits
        </Button>
        <Button
          variant={tab === "past" ? "default" : "outline"}
          onClick={() => setTab("past")}
        >
          Visit history
        </Button>
      </div>
      <ErrorMessage error={query.error || cancel.error} />
      {query.isPending ? (
        <Loading />
      ) : filtered?.length ? (
        <div className="appointment-list">
          {filtered.map((a) => (
            <Card key={a.id}>
              <CardContent className="appointment-row">
                <div className="appointment-date">
                  <CalendarDays size={20} />
                  <strong>{dateLabel(a.date)}</strong>
                  <small>Serial #{a.serialNumber}</small>
                </div>
                <Initials name={a.doctor.user.name} />
                <div className="appointment-person">
                  <h3>{a.doctor.user.name}</h3>
                  <p>
                    {a.doctor.department.name} · Room {a.doctor.roomNumber}
                  </p>
                  {user?.role !== "PATIENT" && (
                    <small>Patient: {a.patient.name}</small>
                  )}
                </div>
                <Status status={a.status} />
                <div className="row-actions">
                  {["WAITING", "CALLED"].includes(a.status) && (
                    <Button asChild variant="outline">
                      <Link
                        href={`/queue?doctor=${a.doctor.id}&date=${a.date.slice(0, 10)}`}
                      >
                        Track queue
                      </Link>
                    </Button>
                  )}
                  {a.status === "WAITING" && user?.role !== "DOCTOR" && (
                    <Button variant="ghost" onClick={() => setCancelId(a.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title={
            tab === "upcoming"
              ? "Your calendar has room for care"
              : "Your health journey starts here"
          }
          text={
            tab === "upcoming"
              ? "Book a visit with a specialist when you’re ready."
              : "Completed and cancelled visits will appear here."
          }
        />
      )}
      <AlertDialog
        open={!!cancelId}
        onOpenChange={(open) => {
          if (!open) setCancelId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Your place will be released. You can book another visit whenever
              you’re ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep appointment</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancel.isPending}
              onClick={() => cancelId && cancel.mutate(cancelId)}
            >
              Cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export default function Appointments() {
  return (
    <Access>
      <AppointmentsContent />
    </Access>
  );
}
