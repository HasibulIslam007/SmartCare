"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage, Submit } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { send } from "@/services/api";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const request = useMutation({
    mutationFn: (email: string) => send("auth/forgot-password", { email }),
    onSuccess: () => setSent(true),
  });
  return (
    <AuthShell>
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h2>Reset your password.</h2>
      {sent ? (
        <>
          {/* Deliberately identical whether or not the account exists. */}
          <p>
            If that email address has a SmartCare account, we have sent
            instructions for choosing a new password. Check your inbox and spam
            folder. The link expires in one hour.
          </p>
          <p className="auth-switch">
            <Link href="/login">Back to sign in</Link>
          </p>
        </>
      ) : (
        <>
          <p>
            Enter the email address on your account and we will send you a link
            to choose a new password.
          </p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const values = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              request.mutate(String(values.email));
            }}
          >
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <ErrorMessage error={request.error} />
            <Submit pending={request.isPending}>Send reset link</Submit>
          </form>
          <p className="auth-switch">
            Remembered it? <Link href="/login">Back to sign in</Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
