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
  { href: "/admin/supabase-ledger", label: "Supabase Ledger", icon: "Chain" },
];

export default function SmartContractsPage() {
  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="Supabase Mockchain Ledger" subtitle="Credential receipts appended within the Supabase database" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm text-[var(--fg-muted)]">Ledger Store</div>
          <div className="mt-2 break-all font-mono text-sm text-[var(--fg)]">public.mockchain_attestations</div>
          <div className="mt-4"><StatusPill status="active" /></div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-[var(--fg-muted)]">Receipt Source</div>
          <div className="mt-2 font-sora text-3xl font-extrabold text-[var(--fg)]">Supabase</div>
          <p className="mt-2 text-xs text-[var(--fg-muted)]">Append-only credential receipts with generated sequence numbers.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
