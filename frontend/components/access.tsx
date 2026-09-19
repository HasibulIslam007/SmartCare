"use client";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { Role } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Empty, Loading, ErrorMessage } from "./shared";
export function Access({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const session = useSession();
  if (session.isPending) return <Loading />;
  if (session.error) return <ErrorMessage error={session.error} />;
  if (!session.data)
    return (
      <div>
        <Empty
          title="Your care is personal."
          text="Sign in to securely access your appointments and health information."
        />
        <div className="center">
          <Button asChild>
            <Link href="/login">Sign in to continue</Link>
          </Button>
        </div>
      </div>
    );
  if (roles && !roles.includes(session.data.role))
    return (
      <Empty
        title="A different workspace"
        text="This page is available to the hospital roles responsible for this part of your care."
      />
    );
  return <>{children}</>;
}
