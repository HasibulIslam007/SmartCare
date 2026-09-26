"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiItems, Department, Doctor } from "@/services/api";
import { DoctorCard } from "@/components/doctor-card";
import { Empty, ErrorMessage, Loading, PageHeading } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export default function Doctors() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiItems<Department>("departments"),
  });
  const doctors = useQuery({
    queryKey: ["doctors"],
    queryFn: () => apiItems<Doctor>("doctors"),
  });
  const filtered = doctors.data?.filter(
    (d) =>
      (!department || d.department.id === department) &&
      `${d.user.name} ${d.specialization} ${d.department.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="THE RIGHT CARE STARTS HERE"
        title="Find your doctor"
        description="Meet our specialists and choose a time that works for you."
      />
      <div className="search-field">
        <Search size={19} />
        <Input
          aria-label="Search doctors"
          placeholder="Search by doctor, specialty, or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filter-chips">
        <Button
          variant={!department ? "default" : "outline"}
          onClick={() => setDepartment("")}
        >
          All specialists
        </Button>
        {departments.data?.map((d) => (
          <Button
            key={d.id}
            variant={department === d.id ? "default" : "outline"}
            onClick={() => setDepartment(d.id)}
          >
            {d.name}
          </Button>
        ))}
      </div>
      <ErrorMessage error={doctors.error || departments.error} />
      {doctors.isPending ? (
        <Loading />
      ) : (
        <>
          <div className="results-label">
            {filtered?.length ?? 0} specialists · Consultation fees in BDT
          </div>
          <div className="doctor-grid">
            {filtered?.map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
          {filtered?.length === 0 && (
            <Empty
              title="No matching specialists"
              text="Try another name or choose a different department."
            />
          )}
        </>
      )}
    </>
  );
}
