"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Access } from "@/components/access";
import {
  ErrorMessage,
  Loading,
  PageHeading,
  Submit,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, MfaStatus, send } from "@/services/api";

interface Enrolment {
  secret: string;
  keyUri: string;
}

function Content() {
  const client = useQueryClient();
  const [enrolment, setEnrolment] = useState<Enrolment>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const status = useQuery({
    queryKey: ["mfa"],
    queryFn: () => api<MfaStatus>("auth/mfa"),
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["mfa"] });
  const enroll = useMutation({
    mutationFn: () => send<Enrolment>("auth/mfa/enroll", {}),
    onSuccess: (data) => setEnrolment(data),
  });
  const activate = useMutation({
    mutationFn: (code: string) =>
      send<{ recoveryCodes: string[] }>("auth/mfa/activate", { code }),
    onSuccess: ({ recoveryCodes }) => {
      setRecoveryCodes(recoveryCodes);
      setEnrolment(undefined);
      refresh();
    },
  });
  const disable = useMutation({
    mutationFn: (code: string) => send("auth/mfa/disable", { code }),
    onSuccess: () => {
      setRecoveryCodes([]);
      refresh();
      activate.reset();
      disable.reset();
    },
  });

  function codeForm(
    mutation: {
      mutate: (code: string) => void;
      isPending: boolean;
      error: unknown;
    },
    label: string,
    id: string,
  ) {
    return (
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          mutation.mutate(String(values.code));
        }}
      >
        <div>
          <Label htmlFor={id}>Code from your authenticator app</Label>
          <Input
            id={id}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            pattern="[0-9]{6}"
            title="Enter the 6-digit code from your authenticator app."
            maxLength={6}
            required
          />
          <small>Codes change every 30 seconds.</small>
        </div>
        <ErrorMessage error={mutation.error} />
        <Submit pending={mutation.isPending}>{label}</Submit>
      </form>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="ACCOUNT SECURITY"
        title="Two-factor authentication"
        description="Protect your hospital account with a code from your authenticator app."
      />
      <Card>
        <CardContent>
          {status.isPending ? (
            <Loading />
          ) : status.error ? (
            <ErrorMessage error={status.error} />
          ) : recoveryCodes.length ? (
            <>
              <h2>
                <KeyRound size={18} /> Save your recovery codes
              </h2>
              <p>
                Two-factor authentication is now on. These codes are shown once
                and are the only way to sign in if you lose your authenticator.
                Store them somewhere safe and keep them private.
              </p>
              <ul className="recovery-codes">
                {recoveryCodes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
              <Button type="button" onClick={() => setRecoveryCodes([])}>
                I have saved my recovery codes
              </Button>
            </>
          ) : status.data?.enabled ? (
            <>
              <h2>
                <ShieldCheck size={18} /> Two-factor authentication is on
              </h2>
              <p>
                You have {status.data.recoveryCodesRemaining} unused recovery
                code
                {status.data.recoveryCodesRemaining === 1 ? "" : "s"} remaining.
              </p>
              <p>
                Turning this off requires a current code, so a stolen session
                alone cannot remove it.
              </p>
              {codeForm(disable, "Turn off two-factor authentication", "disable-code")}
            </>
          ) : enrolment ? (
            <>
              <h2>Add SmartCare to your authenticator app</h2>
              <p>
                In your authenticator app, add a new account and enter this key.
                Keep it private — anyone with it can generate your codes.
              </p>
              <div>
                <Label htmlFor="secret">Setup key</Label>
                <Input
                  id="secret"
                  readOnly
                  value={enrolment.secret}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <small>
                  No QR code is shown on purpose: generating one would send your
                  secret to a third-party image service.
                </small>
              </div>
              <p>
                <a href={enrolment.keyUri}>Open in your authenticator app</a>
              </p>
              {codeForm(
                activate,
                "Turn on two-factor authentication",
                "activate-code",
              )}
            </>
          ) : (
            <>
              <h2>Two-factor authentication is off</h2>
              <p>
                Your account is protected by your password alone. Adding a
                second factor is strongly recommended for staff accounts, which
                can reach patient records.
              </p>
              <ErrorMessage error={enroll.error} />
              <Button
                type="button"
                disabled={enroll.isPending}
                onClick={() => enroll.mutate()}
              >
                <ShieldCheck size={16} /> Set up authenticator app
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function SecurityPage() {
  return (
    <Access roles={["DOCTOR", "RECEPTIONIST", "ADMIN"]}>
      <Content />
    </Access>
  );
}
