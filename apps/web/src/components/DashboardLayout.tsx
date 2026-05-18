"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AppIcon, cn, ThemeToggle } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  nav: NavItem[];
  variant?: "light" | "dark";
  backgroundImage?: string;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, nav, variant = "light", backgroundImage, children }: DashboardLayoutProps) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const links = [...nav, { href: "/auth/login", label: "Logout", icon: "Close" }];

  const navLinks = (
    <>
      {links.map((item) => {
        const active = item.href !== "/auth/login" && (pathname === item.href || pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-[var(--primary)] bg-[var(--primary-fade)] text-[var(--primary)]"
                : "border-[color:var(--primary)]/35 bg-[#eeecff] text-[var(--fg)] hover:border-[var(--primary)] hover:bg-[var(--primary-fade)] dark:bg-[var(--muted)]"
            )}
          >
            <AppIcon name={item.label || item.icon} size={16} className="shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="min-w-5 rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-center text-xs font-bold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-[var(--bg)] px-3 py-4 sm:px-6", variant === "dark" && "dark")}>
      {backgroundImage && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center blur-[3px] scale-105"
            style={{ backgroundImage: `url("${backgroundImage}")` }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-slate-950/55" />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-7xl">
        <section
          className={cn(
            "rounded border border-[color:var(--accent)]/55 p-3 shadow-card",
            backgroundImage
              ? "bg-white/78 shadow-2xl backdrop-blur-md dark:bg-slate-950/75"
              : "bg-[var(--accent-fade)]/55 dark:bg-[var(--surface-raised)]"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1 text-center">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-sora text-sm font-bold text-[var(--fg)]">{title}</h1>
              {subtitle && <p className="truncate text-xs text-[var(--fg-muted)]">{subtitle}</p>}
            </div>
            <ThemeToggle className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] md:hidden"
              aria-label="Toggle dashboard navigation"
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <div className={cn("rounded border border-[var(--border)] p-3", backgroundImage ? "bg-white/88 backdrop-blur-sm dark:bg-slate-950/80" : "bg-[var(--surface)]")}>
            <div className="mb-3 text-center text-xs font-semibold text-[var(--fg-muted)]">Sidebar</div>
            <nav className="hidden flex-wrap justify-center gap-4 md:flex">{navLinks}</nav>
            {open && <nav className="grid gap-2 md:hidden">{navLinks}</nav>}
          </div>

          <main
            className={cn(
              "mt-6 min-w-0 rounded border border-dashed border-[color:var(--primary)]/35 p-3 sm:p-5 md:p-6",
              backgroundImage ? "bg-white/90 shadow-lg backdrop-blur-sm dark:bg-slate-950/80" : "bg-[var(--surface)]/80"
            )}
          >
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
