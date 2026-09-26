"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage, Loading, Submit } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { send } from "@/services/api";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [mismatch, setMismatch] = useState("");
  const reset = useMutation({
    mutationFn: (password: string) =>
      send("auth/reset-password", { token, password }),
    onSuccess: () => setDone(true),
  });
  if (!token)
    return (
      <>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h2>This link is incomplete.</h2>
        <p>
          The address is missing its reset code. Open the most recent link from
          your email, or request a new one.
        </p>
        <p className="auth-switch">
          <Link href="/forgot-password">Request a new link</Link>
        </p>
      </>
    );
  if (done)
    return (
      <>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h2>Your password has been changed.</h2>
        <p>
          You can now sign in with your new password. Reset links can only be
          used once.
        </p>
        <p className="auth-switch">
          <Link href="/login">Sign in to SmartCare</Link>
        </p>
      </>
    );
  return (
    <>
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h2>Choose a new password.</h2>
      <p>
        Pick something you have not used before. Passwords must be at least 12
        characters.
      </p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          const password = String(values.password);
          if (password !== String(values.confirm)) {
            setMismatch("Those passwords do not match.");
            return;
          }
          setMismatch("");
          reset.mutate(password);
        }}
      >
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            minLength={12}
            maxLength={128}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Type it again"
            minLength={12}
            maxLength={128}
            required
          />
        </div>
        <ErrorMessage error={mismatch ? new Error(mismatch) : reset.error} />
        <Submit pending={reset.isPending}>Save new password</Submit>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<Loading />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
