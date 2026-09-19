"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>Let’s try that again.</h1>
      <p>
        This page couldn’t load. Your saved information is still in your
        account.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
