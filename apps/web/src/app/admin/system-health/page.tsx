"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, SectionHeader, StatusPill } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Overview", icon: "Dash" },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/audit", label: "Audit Logs", icon: "Audit" },
  { href: "/admin/system-health", label: "System Health", icon: "Health" },
  { href: "/admin/fraud-warnings", label: "Fraud Warnings", icon: "Warn" },
  { href: "/admin/institutions", label: "Institutions", icon: "Inst" },
  { href: "/admin/companies", label: "Companies", icon: "Co" },
  { href: "/admin/smart-contracts", label: "Smart Contracts", icon: "Chain" },
];

const SERVICES = [
  ["Web Frontend", "active", "86 ms"],
  ["API Server", "active", "112 ms"],
  ["Database", "active", "19 ms"],
  ["Storage", "active", "44 ms"],
  ["Local Chain RPC", "active", "73 ms"],
];

export default function SystemHealthPage() {
  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="System Health" subtitle="Operational status for platform services" />
      <div className="grid gap-4 md:grid-cols-2">
        {SERVICES.map(([name, status, latency]) => (
          <Card key={name} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-sora text-sm font-bold text-[var(--fg)]">{name}</div>
                <div className="mt-1 text-xs text-[var(--fg-muted)]">Latency {latency}</div>
              </div>
              <StatusPill status={status} />
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
