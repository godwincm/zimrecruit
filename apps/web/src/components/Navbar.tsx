"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../hooks/useAuthStore";
import { Logo, ThemeToggle } from "./ui";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const dashPath =
    user?.roles.includes("admin") ? "/admin" :
    user?.roles.includes("verifier") ? "/verifier" :
    user?.roles.includes("employer") ? "/employer" :
    "/applicant";

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href="/jobs" className="rounded-lg px-3 py-2 text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)]">
            Jobs
          </Link>
          <Link href="/verify" className="rounded-lg px-3 py-2 text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)]">
            Verify
          </Link>
          {user && (
            <Link href={dashPath} className="rounded-lg px-3 py-2 text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)]">
              Dashboard
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={dashPath}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary)] text-white"
              >
                <User size={16} />
              </Link>
              <button
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--fg-muted)] transition hover:bg-[var(--muted)]"
                aria-label="Log out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/auth/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]">
                Log in
              </Link>
              <Link href="/auth/register" className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white hover:brightness-90">
                Get Started
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)] md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3 md:hidden">
          <div className="grid gap-2 text-sm font-medium">
            <Link onClick={() => setOpen(false)} href="/jobs" className="rounded-md px-3 py-2 text-[var(--fg-muted)] hover:bg-[var(--muted)] hover:text-[var(--fg)]">
              Jobs
            </Link>
            <Link onClick={() => setOpen(false)} href="/verify" className="rounded-md px-3 py-2 text-[var(--fg-muted)] hover:bg-[var(--muted)] hover:text-[var(--fg)]">
              Verify
            </Link>
            {user && (
              <Link onClick={() => setOpen(false)} href={dashPath} className="rounded-md px-3 py-2 text-[var(--fg-muted)] hover:bg-[var(--muted)] hover:text-[var(--fg)]">
                Dashboard
              </Link>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
            <ThemeToggle />
            {user ? (
              <button onClick={handleLogout} className="btn-ghost h-10 px-3">
                <LogOut size={15} />
                Log out
              </button>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} href="/auth/login" className="btn-ghost h-10 px-3">
                  Log in
                </Link>
                <Link onClick={() => setOpen(false)} href="/auth/register" className="btn-primary h-10 px-3">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
