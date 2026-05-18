"use client";

import { clsx } from "clsx";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  Link2,
  Mail,
  MapPin,
  Search,
  Shield,
  Stethoscope,
  Users,
  UserRound,
  Eye,
  EyeOff,
  Moon,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import { forwardRef, useEffect, useState, type HTMLAttributes, type InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | false | null)[]) {
  return twMerge(clsx(inputs));
}

const ICONS: Record<string, LucideIcon> = {
  activity: Activity,
  admin: Activity,
  "active jobs": Briefcase,
  "approved / rejected": CheckCircle2,
  applicants: Users,
  applications: ClipboardList,
  apps: ClipboardList,
  audit: Search,
  "audit log": Search,
  candidates: Users,
  chain: Link2,
  close: X,
  dashboard: Home,
  companies: Building2,
  company: Building2,
  done: CheckCircle2,
  documents: FileText,
  education: GraduationCap,
  find: Search,
  health: HeartPulse,
  home: Home,
  institutions: Building2,
  interviews: Calendar,
  jobs: Briefcase,
  location: MapPin,
  mail: Mail,
  medical: Stethoscope,
  "my documents": FileText,
  "my jobs": Briefcase,
  "my profile": UserRound,
  overview: Home,
  people: Users,
  pipeline: Users,
  police: Shield,
  post: Briefcase,
  "post a job": Briefcase,
  "post vacancy": Briefcase,
  profile: UserRound,
  "profile views": Eye,
  queue: ClipboardList,
  reports: Activity,
  report: Activity,
  rpt: Activity,
  search: Search,
  shield: Shield,
  "smart contracts": Link2,
  "system health": HeartPulse,
  "total applicants": Users,
  "total users": Users,
  users: Users,
  logout: X,
  "verified docs": Link2,
  verifier: Shield,
  warning: AlertTriangle,
  warnings: AlertTriangle,
  warn: AlertTriangle,
};

export function AppIcon({
  name,
  size = 18,
  className,
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const raw = String(name ?? "").trim();
  const Icon = ICONS[raw.toLowerCase()] ?? CircleDot;
  return <Icon aria-hidden="true" size={size} className={className} />;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = saved ? saved === "dark" : prefersDark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]",
        className
      )}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      <Icon aria-hidden="true" size={18} />
    </button>
  );
}

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        type={isVisible ? "text" : "password"}
        className={cn("input pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setIsVisible((value) => !value)}
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--fg-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
      >
        <Icon aria-hidden="true" size={18} />
      </button>
    </div>
  );
});

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const sz = size === "sm" ? 14 : 17;
  return (
    <span
      title="Credential Verified"
      className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-fade)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]"
    >
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z" fill="currentColor" opacity={0.2} />
        <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6L12 2z" stroke="currentColor" strokeWidth={1.5} fill="none" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-green-50", text: "text-green-700", label: "Open" },
  expired: { bg: "bg-orange-50", text: "text-orange-700", label: "Expired" },
  closed: { bg: "bg-slate-100", text: "text-slate-500", label: "Closed" },
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  approved: { bg: "bg-green-50", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  active: { bg: "bg-green-50", text: "text-green-700", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-500", label: "Inactive" },
  applied: { bg: "bg-blue-50", text: "text-blue-700", label: "Applied" },
  shortlisted: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Shortlisted" },
  interview: { bg: "bg-green-50", text: "text-green-700", label: "Interview" },
  offer: { bg: "bg-blue-50", text: "text-blue-700", label: "Offer" },
  withdrawn: { bg: "bg-slate-100", text: "text-slate-500", label: "Withdrawn" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: "bg-slate-100", text: "text-slate-500", label: status };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.37, flexShrink: 0 }}
      className={cn(
        "flex items-center justify-center rounded-full bg-[var(--primary)] font-bold text-white",
        className
      )}
    >
      {initials}
    </div>
  );
}

export function Card({
  children,
  className,
  hover = false,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-card",
        hover && "cursor-pointer transition-shadow hover:shadow-card-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  warn = false,
}: {
  icon?: string;
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-[var(--primary)]">
          <AppIcon name={label || icon} size={24} />
        </span>
        {sub && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              warn ? "bg-orange-50 text-orange-600" : "bg-[var(--primary-fade)] text-[var(--primary)]"
            )}
          >
            {sub}
          </span>
        )}
      </div>
      <div className="font-sora text-3xl font-extrabold text-[var(--fg)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--fg-muted)]">{label}</div>
    </Card>
  );
}

const DOC_TYPE: Record<string, { label: string; className: string }> = {
  education: { label: "Education", className: "bg-blue-50 text-blue-700" },
  police_clearance: { label: "Police Clearance", className: "bg-green-50 text-green-700" },
  medical: { label: "Medical", className: "bg-orange-50 text-orange-700" },
  id: { label: "ID Document", className: "bg-purple-50 text-purple-700" },
  other: { label: "Other", className: "bg-slate-50 text-slate-500" },
};

export function DocTypePill({ type }: { type: string }) {
  const d = DOC_TYPE[type] ?? DOC_TYPE.other;
  return (
    <span className={cn("rounded-md px-2.5 py-0.5 text-xs font-semibold", d.className)}>
      {d.label}
    </span>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity={0.25} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
        <path
          d="M20 3L5 9v12c0 9 6.72 17.4 15 19.5C29.28 38.4 35 30 35 21V9L20 3z"
          fill="var(--primary)"
          opacity={0.15}
        />
        <path
          d="M20 3L5 9v12c0 9 6.72 17.4 15 19.5C29.28 38.4 35 30 35 21V9L20 3z"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="none"
        />
        <path d="M10 10l10-3.5 10 3.5" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" />
        <ellipse cx="20" cy="14" rx="4" ry="3" fill="var(--accent)" opacity={0.9} />
        <circle cx="20" cy="10.5" r="1.5" fill="var(--accent)" />
        <path d="M14 23l5 5 8-8" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-sora text-xl font-extrabold text-[var(--primary)]">
        Zim<span className="text-[var(--accent)]">Recruit</span>
      </span>
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-sora text-2xl font-extrabold text-[var(--fg)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--fg-muted)]">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
