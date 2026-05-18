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

export default function SmartContractsPage() {
  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="Smart Contracts" subtitle="Local chain registry configuration and verifier role status" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm text-[var(--fg-muted)]">Registry Contract</div>
          <div className="mt-2 break-all font-mono text-sm text-[var(--fg)]">0x5FbDB2315678afecb367f032d93F642f64180aa3</div>
          <div className="mt-4"><StatusPill status="active" /></div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[var(--fg-muted)]">Chain ID</div>
          <div className="mt-2 font-sora text-3xl font-extrabold text-[var(--fg)]">31337</div>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">Used by the local development chain.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
