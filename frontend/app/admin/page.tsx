"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, send, User, Department } from "@/services/api";
import { Access } from "@/components/access";
import { ErrorMessage, PageHeading, Submit } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
function Content() {
  const client = useQueryClient();
  const { data: me } = useSession();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<User[]>("admin/users"),
  });
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<Department[]>("departments"),
  });
  const stats = useQuery({
    queryKey: ["analytics"],
    queryFn: () =>
      api<{
        patients: number;
        doctors: number;
        departments: number;
        appointments: { status: string; _count: number }[];
      }>("admin/analytics"),
  });
  const refresh = () => {
    client.invalidateQueries({ queryKey: ["departments"] });
    client.invalidateQueries({ queryKey: ["doctors"] });
    client.invalidateQueries({ queryKey: ["admin-users"] });
    client.invalidateQueries({ queryKey: ["analytics"] });
  };
  const role = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      send(`users/${id}/role`, { role }, "PATCH"),
    onSuccess: refresh,
  });
  const department = useMutation({
    mutationFn: (data: unknown) => send("departments", data),
    onSuccess: refresh,
  });
  const doctor = useMutation({
    mutationFn: (data: unknown) => send("doctors", data),
    onSuccess: refresh,
  });
  return (
    <>
      <PageHeading
        eyebrow="HOSPITAL OPERATIONS"
        title="Administration"
        description="Manage your people, departments, and care capacity."
      />
      <div className="stats-grid">
        {[
          { label: "Registered patients", value: stats.data?.patients },
          { label: "Doctors", value: stats.data?.doctors },
          { label: "Departments", value: stats.data?.departments },
          {
            label: "Today’s visits",
            value: stats.data?.appointments.reduce((n, a) => n + a._count, 0),
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent>
              <span className="eyebrow">{s.label}</span>
              <strong className="stat-value">{s.value ?? "—"}</strong>
            </CardContent>
          </Card>
        ))}
      </div>
      <ErrorMessage error={stats.error || users.error || role.error} />
      <div className="section-title">
        <h2>People & permissions</h2>
        <span className="muted">Most recent 50 accounts</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Current role</th>
              <th>Assign role</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  {u.id === me?.id ? (
                    "Your account"
                  ) : (
                    <form
                      className="inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        role.mutate({
                          id: u.id,
                          role: String(
                            new FormData(e.currentTarget).get("role"),
                          ),
                        });
                      }}
                    >
                      <select
                        name="role"
                        aria-label={`Role for ${u.name}`}
                        defaultValue={u.role}
                      >
                        {["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMIN"].map(
                          (r) => (
                            <option key={r}>{r}</option>
                          ),
                        )}
                      </select>
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={role.isPending}
                      >
                        Save
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="workspace-grid">
        <Card>
          <CardHeader>
            <CardTitle>Add a department</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                department.mutate(
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
              }}
            >
              {[
                { name: "name", label: "Department name" },
                { name: "description", label: "Description" },
                { name: "location", label: "Location / floor" },
              ].map((f) => (
                <div key={f.name}>
                  <Label htmlFor={`dept-${f.name}`}>{f.label}</Label>
                  <Input id={`dept-${f.name}`} name={f.name} required />
                </div>
              ))}
              <ErrorMessage error={department.error} />
              {department.isSuccess && (
                <p className="success-message">Department added.</p>
              )}
              <Submit pending={department.isPending}>Add department</Submit>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add a doctor profile</CardTitle>
            <p className="muted">
              Assign a registered account the Doctor role first.
            </p>
          </CardHeader>
          <CardContent>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                doctor.mutate({
                  ...data,
                  experience: Number(data.experience),
                  consultationFee: Number(data.consultationFee),
                });
              }}
            >
              <div>
                <Label htmlFor="doctor-user">Doctor account</Label>
                <select id="doctor-user" name="userId" defaultValue="" required>
                  <option value="" disabled>
                    Choose an account
                  </option>
                  {users.data
                    ?.filter((u) => u.role === "DOCTOR")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label htmlFor="doctor-dept">Department</Label>
                <select
                  id="doctor-dept"
                  name="departmentId"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Choose a department
                  </option>
                  {departments.data?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              {[
                { name: "qualification", label: "Qualification", type: "text" },
                {
                  name: "specialization",
                  label: "Specialization",
                  type: "text",
                },
                {
                  name: "experience",
                  label: "Experience (years)",
                  type: "number",
                },
                {
                  name: "consultationFee",
                  label: "Consultation fee (BDT)",
                  type: "number",
                },
                { name: "roomNumber", label: "Room number", type: "text" },
              ].map((f) => (
                <div key={f.name}>
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input
                    id={f.name}
                    name={f.name}
                    type={f.type}
                    min={0}
                    required
                  />
                </div>
              ))}
              <ErrorMessage error={doctor.error} />
              {doctor.isSuccess && (
                <p className="success-message">
                  Doctor profile added. Add visiting hours in the care
                  workspace.
                </p>
              )}
              <Submit pending={doctor.isPending}>Add doctor</Submit>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
export default function Admin() {
  return (
    <Access roles={["ADMIN"]}>
      <Content />
    </Access>
  );
}
