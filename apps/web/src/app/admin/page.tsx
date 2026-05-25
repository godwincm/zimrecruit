"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, StatCard, SectionHeader, Spinner, Avatar } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const ADMIN_EXTRA_NAV = [
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/system-health", label: "System Health", icon: "Health" },
  { href: "/admin/fraud-warnings", label: "Fraud Warnings", icon: "Warn" },
  { href: "/admin/companies", label: "Companies", icon: "Co" },
  { href: "/admin/supabase-ledger", label: "Supabase Ledger", icon: "Chain" },
];

const NAV = [
  { href: "/admin",              label: "Overview",     icon: "Overview" },
  { href: "/admin/institutions", label: "Institutions", icon: "Institutions" },
  { href: "/admin/audit",        label: "Audit Log",    icon: "Audit Log" },
];

const ACTION_COLORS: Record<string, string> = {
  DOC_UPLOAD:         "bg-blue-50 text-blue-700",
  VERIFY_APPROVE:     "bg-green-50 text-green-700",
  VERIFY_REJECT:      "bg-red-50 text-red-700",
  JOB_POST:           "bg-purple-50 text-purple-700",
  JOB_APPLY:          "bg-yellow-50 text-yellow-700",
  INSTITUTION_ONBOARD:"bg-indigo-50 text-indigo-700",
  AUTH_LOGIN:         "bg-slate-50 text-slate-500",
};

export default function AdminOverview() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.audit({ limit: "10" })
      .then(({ logs }: { logs: any[] }) => setLogs(logs))
      .catch(() => toast.error("Could not load audit log."))
      .finally(() => setLoading(false));
  }, []);

  const VERIFICATION_RATES = [
    { inst: "Zimbabwe Republic Police",   rate: 88, color: "#0e8a3e" },
    { inst: "University of Zimbabwe",     rate: 74, color: "#0369a1" },
    { inst: "Harare Central Hospital",    rate: 91, color: "#7c3aed" },
    { inst: "Midlands State University",  rate: 62, color: "#d4af37" },
  ];

  return (
    <DashboardLayout
      title="Admin Console"
      subtitle="ZimRecruit Platform"
      nav={[...NAV, ...ADMIN_EXTRA_NAV]}
      backgroundImage="/dashboard-backgrounds/admin.jpg"
    >
      <SectionHeader title="Platform Overview" subtitle="Real-time platform health and activity" />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="Total Users" label="Total Users"       value="24.8K" sub="+142 today" />
        <StatCard icon="Verified Docs" label="Verified Docs"      value="12.4K" />
        <StatCard icon="Active Jobs" label="Active Jobs"        value="47" />
        <StatCard icon="Pending Queue" label="Pending Queue"      value="22"   sub="3 institutions" warn />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Verification rates */}
        <Card className="p-6">
          <h3 className="font-sora text-sm font-bold text-[var(--fg)] mb-5">Monthly Verification Rate</h3>
          <div className="space-y-4">
            {VERIFICATION_RATES.map(({ inst, rate, color }) => (
              <div key={inst}>
                <div className="flex justify-between mb-1.5 text-sm">
                  <span className="text-[var(--fg)] font-medium truncate mr-2">{inst}</span>
                  <span className="font-bold shrink-0" style={{ color }}>{rate}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* User breakdown */}
        <Card className="p-6">
          <h3 className="font-sora text-sm font-bold text-[var(--fg)] mb-5">User Distribution</h3>
          <div className="space-y-3">
            {[
              { role: "Applicants", count: "23,840", pct: 96, color: "#0e8a3e" },
              { role: "Employers",  count: "380",    pct: 2,  color: "#0369a1" },
              { role: "Verifiers",  count: "42",     pct: 1,  color: "#c2410c" },
              { role: "Admins",     count: "8",      pct: 0,  color: "#7c3aed" },
            ].map(u => (
              <div key={u.role} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-sm font-medium text-[var(--fg)]">{u.role}</div>
                <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(u.pct, 0.5)}%`, background: u.color }} />
                </div>
                <span className="w-16 text-right text-sm font-semibold text-[var(--fg)]">{u.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent audit events */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sora text-sm font-bold text-[var(--fg)]">Latest Audit Events</h3>
          <a href="/admin/audit" className="text-sm text-[var(--primary)] font-semibold hover:underline">View all</a>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Spinner size={24} /></div>
        ) : (
          <div className="space-y-1">
            {logs.map(log => (
              <div key={log.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--muted)] transition">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--muted)]">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ACTION_COLORS[log.action] ?? "bg-slate-50 text-slate-500"}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-[var(--fg)] font-medium truncate">{log.actor_id ?? "System"}</span>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">{log.entity} · {log.ip_address}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-[var(--fg-hint)]">
                  {new Date(log.created_at).toLocaleTimeString("en-ZW", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
