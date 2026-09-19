"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, send, today } from "@/services/api";
import { useSession } from "@/hooks/use-session";
import { Access } from "@/components/access";
import {
  ErrorMessage,
  Initials,
  Loading,
  PageHeading,
  Submit,
} from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
interface Profile {
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  allergies?: string;
}
function Content() {
  const { data: user } = useSession();
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<Profile | null>("patients/me"),
  });
  const save = useMutation({
    mutationFn: (data: unknown) => send("patients/me", data, "PUT"),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  return (
    <>
      <PageHeading
        eyebrow="THE PERSON BEHIND THE PATIENT"
        title="My profile"
        description="Keep the information your care team needs up to date."
      />
      <Card>
        <CardContent>
          <div className="profile-intro">
            <Initials name={user?.name ?? ""} large />
            <div>
              <h2>{user?.name}</h2>
              <p>
                {user?.email} · {user?.phone}
              </p>
            </div>
          </div>
          {q.isPending ? (
            <Loading />
          ) : (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                save.mutate(
                  Object.fromEntries(
                    Object.entries(data).filter(([, v]) => v !== ""),
                  ),
                );
              }}
            >
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  name="dateOfBirth"
                  type="date"
                  max={today()}
                  defaultValue={q.data?.dateOfBirth?.slice(0, 10)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  defaultValue={q.data?.gender ?? ""}
                >
                  <option value="">Choose</option>
                  {["Female", "Male", "Other", "Prefer not to say"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="blood">Blood group</Label>
                <select
                  id="blood"
                  name="bloodGroup"
                  defaultValue={q.data?.bloodGroup ?? ""}
                >
                  <option value="">Choose</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="emergency">Emergency contact</Label>
                <Input
                  id="emergency"
                  name="emergencyContact"
                  defaultValue={q.data?.emergencyContact ?? ""}
                  placeholder="Name and phone number"
                  maxLength={100}
                />
              </div>
              <div className="full-width">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={q.data?.address ?? ""}
                  maxLength={500}
                />
              </div>
              <div className="full-width">
                <Label htmlFor="allergies">Known allergies</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  defaultValue={q.data?.allergies ?? ""}
                  placeholder="List any known allergies, or write None"
                  maxLength={1000}
                />
              </div>
              <div className="full-width">
                <ErrorMessage error={q.error || save.error} />
                {save.isSuccess && (
                  <p className="success-message" role="status">
                    Your profile has been saved.
                  </p>
                )}
                <Submit pending={save.isPending}>Save my profile</Submit>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
export default function ProfilePage() {
  return (
    <Access roles={["PATIENT"]}>
      <Content />
    </Access>
  );
}
