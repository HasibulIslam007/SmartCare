"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ErrorMessage, Loading, Submit } from "@/components/shared";
import { send } from "@/services/api";

function Confirm() {
  const token = useSearchParams().get("token") ?? "";
  const confirm = useMutation({
    mutationFn: () => send("auth/verify-email", { token }),
  });
  if (!token)
    return (
      <>
        <p className="eyebrow">EMAIL CONFIRMATION</p>
        <h2>This link is incomplete.</h2>
        <p>
          The address is missing its confirmation code. Open the most recent
          link from your email.
        </p>
        <p className="auth-switch">
          <Link href="/login">Back to sign in</Link>
        </p>
      </>
    );
  if (confirm.isSuccess)
    return (
      <>
        <p className="eyebrow">EMAIL CONFIRMATION</p>
        <h2>Your email address is confirmed.</h2>
        <p>
          Thank you. We will use this address for appointment and report
          updates.
        </p>
        <p className="auth-switch">
          <Link href="/login">Sign in to SmartCare</Link>
        </p>
      </>
    );
  return (
    <>
      <p className="eyebrow">EMAIL CONFIRMATION</p>
      <h2>Confirm your email address.</h2>
      <p>
        Confirm that this address belongs to you. It takes a moment, and the
        link can only be used once.
      </p>
      {/*
        Confirmation is a button rather than an automatic request: some email
        clients pre-fetch links, which would otherwise spend the one-time code
        before the recipient ever opens the page.
      */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          confirm.mutate();
        }}
      >
        <ErrorMessage error={confirm.error} />
        <Submit pending={confirm.isPending}>
          <MailCheck size={16} /> Confirm my email address
        </Submit>
      </form>
      <p className="auth-switch">
        <Link href="/">Continue to SmartCare</Link>
      </p>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Suspense fallback={<Loading />}>
        <Confirm />
      </Suspense>
    </AuthShell>
  );
}
