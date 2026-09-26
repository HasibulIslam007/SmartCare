"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Stethoscope,
  Activity,
  ClipboardList,
  HeartPulse,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { apiItems, Appointment, Doctor, dateLabel } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DoctorCard } from "@/components/doctor-card";
import { Empty, ErrorMessage, Loading, Status } from "@/components/shared";
export default function Overview() {
  const { data: user } = useSession();
  const doctors = useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiItems<Doctor>("doctors"),
  });
  const appointments = useQuery({
    queryKey: ["appointments"],
    queryFn: () => apiItems<Appointment>("appointments"),
    enabled: !!user,
  });
  const next = appointments.data
    ?.filter((a) => a.status === "WAITING" || a.status === "CALLED")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <>
      <div className="overview-heading">
        <div>
          <p className="eyebrow">YOUR HEALTH, CONNECTED</p>
          <h1>
            {user
              ? `Hello, ${user.name.split(" ")[0]}.`
              : "A little care goes a long way."}{" "}
            <span className="greeting-spark">✳</span>
          </h1>
          <p>Let’s make taking care of yourself a little easier.</p>
        </div>
        <Button asChild>
          <Link href="/doctors">
            <Plus size={17} />
            Book an appointment
          </Link>
        </Button>
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> HERE FOR EVERY STEP
          </span>
          <h2>
            Better health.
            <br />
            <span>Closer to you.</span>
          </h2>
          <p>
            The right doctor, a simpler appointment,
            <br className="desktop-break" /> and more time for what matters.
          </p>
          <Button asChild className="hero-button">
            <Link href="/doctors">
              Find your doctor <ArrowUpRight size={18} />
            </Link>
          </Button>
          <div className="hero-footnote">
            <ShieldCheck size={15} /> Thoughtful care. Connected experience.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="medical-cross">
            <span />
            <span />
          </div>
          <div className="floating-note note-one">
            <span className="floating-icon">
              <HeartPulse size={23} />
            </span>
            <div>
              <b>You’re in good hands</b>
              <small>Care that puts you first</small>
            </div>
          </div>
          <div className="floating-note note-two">
            <span className="tiny-dot" />
            <b>A healthier tomorrow</b>
            <ArrowUpRight size={16} />
          </div>
          <span className="art-plus plus-one">+</span>
          <span className="art-plus plus-two">+</span>
        </div>
      </section>
      <div className="quick-grid">
        {[
          {
            icon: Stethoscope,
            title: "Find a doctor",
            text: "A specialist for your needs",
            href: "/doctors",
          },
          {
            icon: CalendarDays,
            title: "My appointments",
            text: "Your next step to feeling better",
            href: "/appointments",
          },
          {
            icon: Activity,
            title: "Track your queue",
            text: "Stay updated, wherever you are",
            href: "/queue",
          },
          {
            icon: ClipboardList,
            title: "Medical records",
            text: "Your health story, all together",
            href: "/records",
          },
        ].map((x) => (
          <Link className="quick-card" href={x.href} key={x.href}>
            <span className="quick-icon">
              <x.icon size={22} />
            </span>
            <div>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
      <div className="section-title">
        <div>
          <span className="eyebrow">MAKE TIME FOR YOURSELF</span>
          <h2>Your next visit</h2>
        </div>
        <Link href="/appointments">
          View appointments <ArrowRight size={16} />
        </Link>
      </div>
      <div className="visit-grid">
        <Card className="next-visit">
          <CardContent>
            {next ? (
              <>
                <div className="visit-icon">
                  <CalendarDays size={27} />
                </div>
                <div className="visit-detail">
                  <Status status={next.status} />
                  <h3>{next.doctor.user.name}</h3>
                  <p>
                    {next.doctor.department.name} · {dateLabel(next.date)} ·
                    Serial #{next.serialNumber}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/queue">
                    Track queue <ArrowRight size={16} />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="visit-icon">
                  <CalendarDays size={27} />
                </div>
                <div className="visit-detail">
                  <h3>A fresh start for your health</h3>
                  <p>
                    {user
                      ? "No upcoming visits. Find a specialist when you need one."
                      : "Sign in to see your upcoming appointments here."}
                  </p>
                </div>
                <Link className="text-link" href={user ? "/doctors" : "/login"}>
                  {user ? "Explore doctors" : "Sign in"}{" "}
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
        <div className="care-tip">
          <span className="eyebrow">
            <HeartPulse size={14} /> A LITTLE REMINDER
          </span>
          <h3>
            Your health deserves
            <br />a spot on your calendar.
          </h3>
          <p>Make time for your regular check-ups.</p>
        </div>
      </div>
      <div className="section-title">
        <div>
          <span className="eyebrow">PEOPLE BEHIND YOUR CARE</span>
          <h2>Meet your specialists</h2>
        </div>
        <Link href="/doctors">
          Explore all doctors <ArrowRight size={16} />
        </Link>
      </div>
      <ErrorMessage error={doctors.error} />
      {doctors.isPending ? (
        <Loading />
      ) : (
        <div className="doctor-grid">
          {doctors.data?.slice(0, 3).map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </div>
      )}
      {doctors.data?.length === 0 && (
        <Empty
          title="Your care team is getting ready"
          text="Doctor profiles will appear here when your hospital adds them."
        />
      )}
      <p className="sample-note">
        Development preview · The initial doctor directory contains fictional
        sample profiles.
      </p>
    </>
  );
}
