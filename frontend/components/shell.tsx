"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { useInterface } from "@/hooks/use-interface";
import { send } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Initials, ErrorMessage } from "./shared";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const { menuOpen, setMenuOpen } = useInterface();
  const router = useRouter();
  const client = useQueryClient();
  const [error, setError] = useState<unknown>();
  if (pathname === "/login" || pathname === "/register") return <>{children}</>;
  const staff = user && user.role !== "PATIENT";
  const links = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/doctors", label: "Find a doctor", icon: Stethoscope },
    { href: "/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/queue", label: "Live queue", icon: Activity },
    ...(!staff
      ? [
          { href: "/records", label: "Medical records", icon: ClipboardList },
          { href: "/profile", label: "My profile", icon: UserRound },
        ]
      : []),
    ...(staff
      ? [{ href: "/workspace", label: "Care workspace", icon: HeartPulse }]
      : []),
    ...(user?.role === "ADMIN"
      ? [{ href: "/admin", label: "Administration", icon: Settings2 }]
      : []),
  ];
  async function logout() {
    try {
      await send("auth/logout", {});
      client.clear();
      router.push("/login");
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link href="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-symbol">
            <HeartPulse size={25} />
          </span>
          <span>
            SmartCare
            <span className="brand-caption">HOSPITAL & HEALTHCARE</span>
          </span>
        </Link>
        <div className="sidebar-label">YOUR CARE, CONNECTED</div>
        <nav aria-label="Main navigation">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {pathname === item.href && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <ShieldCheck size={22} />
            <h3>Care you can count on.</h3>
            <p>Your appointments and health journey, together in one place.</p>
            <Link href="/doctors">
              Find your specialist <ArrowUpRight size={15} />
            </Link>
          </div>
          {user ? (
            <div className="sidebar-user">
              <Initials name={user.name} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.role.toLowerCase()} account</span>
              </div>
              <button aria-label="Sign out" onClick={logout}>
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="sidebar-signin">
              Sign in to your account <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="mobile-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
            <span className="portal-label">
              {staff ? "Hospital workspace" : "Patient portal"}
            </span>
            <span className="topbar-divider" />
            <span className="muted topbar-subtitle">
              A little closer to better health
            </span>
          </div>
          <div className="topbar-right">
            <span className="secure-label">
              <span />
              Local development
            </span>
            {user ? (
              <Initials name={user.name} />
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login">
                  Sign in <ArrowUpRight size={15} />
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main id="main-content" className="page-content">
          <ErrorMessage error={error} />
          {children}
        </main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} SmartCare. Built around you.</span>
          <span>
            <ShieldCheck size={13} /> Your care. Your privacy.
          </span>
        </footer>
      </div>
    </div>
  );
}
