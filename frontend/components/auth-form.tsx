"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage, Submit } from "./shared";
import { send, User } from "@/services/api";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      send<{ user: User }>(`auth/${register ? "register" : "login"}`, data),
    onSuccess: ({ user }) => {
      client.clear();
      client.setQueryData(["session"], user);
      router.push("/");
      router.refresh();
    },
  });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  }
  return (
    <main id="main-content" className="auth-layout">
      <section className="auth-story">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <HeartPulse />
          </span>
          SmartCare
        </Link>
        <div>
          <span className="eyebrow">A HEALTHIER TOMORROW STARTS HERE</span>
          <h1>
            Good care.
            <br />
            Less waiting.
            <br />
            <em>More living.</em>
          </h1>
          <p>
            A simpler way to manage your health, with the people who care for
            you.
          </p>
          <ul>
            {[
              "Find the right specialist for you",
              "Book appointments in a few moments",
              "Keep your health journey in one place",
            ].map((x) => (
              <li key={x}>
                <Check size={18} />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <span className="auth-note">
          <ShieldCheck size={17} /> Connected care, thoughtfully built.
        </span>
      </section>
      <section className="auth-form-panel">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} /> Back to SmartCare
        </Link>
        <div className="auth-form-content">
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
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to SmartCare?"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-disclaimer">
            Staff accounts are assigned by your hospital administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
