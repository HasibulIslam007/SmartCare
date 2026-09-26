"use client";
import Link from "next/link";
import { HeartPulse, ArrowLeft, Check, ShieldCheck } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
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
        <div className="auth-form-content">{children}</div>
      </section>
    </main>
  );
}
