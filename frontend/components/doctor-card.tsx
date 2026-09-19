"use client";
import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Doctor, days } from "@/services/api";
import { Initials } from "./shared";
export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Card className="doctor-card">
      <CardContent>
        <div className="doctor-top">
          <Initials large name={doctor.user.name} />
          <span className="specialty-tag">{doctor.department.name}</span>
        </div>
        <h3>{doctor.user.name}</h3>
        <p className="doctor-specialty">{doctor.specialization}</p>
        <p className="doctor-qualification">{doctor.qualification}</p>
        <div className="doctor-details">
          <span>
            <Clock3 size={14} />
            {doctor.experience} years of experience
          </span>
          <span>
            <MapPin size={14} />
            Room {doctor.roomNumber} · {doctor.department.location}
          </span>
        </div>
        <div className="doctor-schedule">
          {doctor.schedules.length
            ? doctor.schedules.map((s) => days[s.day]).join(" · ")
            : "Schedule coming soon"}
        </div>
        <div className="doctor-bottom">
          <div>
            <strong>৳{doctor.consultationFee.toLocaleString()}</strong>
            <small>per consultation</small>
          </div>
          <Button asChild variant="outline">
            <Link href={`/doctors/${doctor.id}`}>
              View & book <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
