"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Submit } from "./shared";
import { AuthShell } from "./auth-shell";
import {
  isMfaChallenge,
  LoginResponse,
  send,
  Session,
  User,
} from "@/services/api";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const client = useQueryClient();
  const [challenge, setChallenge] = useState("");
  function startSession(user: User) {
    client.clear();
    client.setQueryData(["session"], user);
    router.push("/");
    router.refresh();
  }
  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      send<LoginResponse>(`auth/${register ? "register" : "login"}`, data),
    onSuccess: (result) => {
      // A password sign-in for a staff account with two-factor enabled.
      if (isMfaChallenge(result)) {
        setChallenge(result.challengeToken);
        return;
      }
      startSession(result.user);
    },
  });
  const verify = useMutation({
    mutationFn: (code: string) =>
      send<Session>("auth/mfa/challenge", { challengeToken: challenge, code }),
    onSuccess: ({ user }) => startSession(user),
  });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  }
  function submitChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    verify.mutate(String(values.code));
  }
  if (challenge)
    return (
      <AuthShell>
        <p className="eyebrow">TWO-FACTOR AUTHENTICATION</p>
        <h2>One more step.</h2>
        <p>
          Enter the 6-digit code from your authenticator app, or one of your
          recovery codes.
        </p>
        <form onSubmit={submitChallenge} className="form-stack">
          <div>
            <Label htmlFor="code">Authenticator or recovery code</Label>
            <Input
              id="code"
              name="code"
              inputMode="text"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              pattern="[0-9]{6}|[0-9a-f]{10}"
              title="Enter the 6-digit code from your app, or a 10-character recovery code."
              maxLength={10}
              required
            />
            <small>
              Open the authenticator you set up for this account. Codes change
              every 30 seconds.
            </small>
          </div>
          <ErrorMessage error={verify.error} />
          <Submit pending={verify.isPending}>Verify and sign in</Submit>
        </form>
        <p className="auth-switch">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              setChallenge("");
              verify.reset();
            }}
          >
            Use a different account
          </Button>
        </p>
      </AuthShell>
    );
  return (
    <AuthShell>
      <p className="eyebrow">WELCOME TO SMARTCARE</p>
      <h2>{register ? "Your care starts here." : "Welcome back."}</h2>
      <p>
        {register
          ? "Create your patient account to book your first visit."
          : "Sign in to pick up where you left off."}
      </p>
      <form onSubmit={submit} className="form-stack">
        {register && (
          <>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Your full name"
                minLength={2}
                maxLength={100}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+8801712345678"
                pattern="\+[1-9][0-9]{7,14}"
                required
              />
              <small>Include your country code.</small>
            </div>
          </>
        )}
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
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            placeholder="At least 12 characters"
            minLength={12}
            maxLength={128}
            required
          />
        </div>
        <ErrorMessage error={mutation.error} />
        <Submit pending={mutation.isPending}>
          {register ? "Create patient account" : "Sign in to SmartCare"}
        </Submit>
      </form>
      {!register && (
        <p className="auth-switch">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      )}
      <p className="auth-switch">
        {register ? "Already have an account?" : "New to SmartCare?"}{" "}
        <Link href={register ? "/login" : "/register"}>
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
      <p className="auth-disclaimer">
        Staff accounts are assigned by your hospital administrator.
      </p>
    </AuthShell>
  );
}
