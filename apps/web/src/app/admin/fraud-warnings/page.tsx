"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, SectionHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

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

function metadata(log: any) {
  if (!log?.metadata) return {};
  if (typeof log.metadata === "string") {
    try {
      return JSON.parse(log.metadata);
    } catch {
      return {};
    }
  }
  return log.metadata;
}

export default function FraudWarningsPage() {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin
      .audit({ action: "ADMIN_WARNING", limit: "100" })
      .then(({ logs }) => setWarnings(logs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="Fraud Warnings" subtitle="Account warnings sent by administrators" />
      <div className="space-y-3">
        {loading && (
          <Card className="p-5">
            <Spinner size={18} />
          </Card>
        )}
        {!loading && warnings.length === 0 && (
          <Card className="p-5 text-sm text-[var(--fg-muted)]">
            No account warnings have been issued.
          </Card>
        )}
        {!loading &&
          warnings.map((warning) => {
            const meta = metadata(warning);
            return (
              <Card key={warning.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-sora text-sm font-bold text-[var(--fg)]">
                      {meta.reason ?? "Account warning"}
                    </div>
                    {meta.details && (
                      <div className="mt-1 text-sm text-[var(--fg-muted)]">{meta.details}</div>
                    )}
                    <div className="mt-2 text-xs text-[var(--fg-muted)]">
                      Applicant: {warning.entity_id} | Admin: {warning.actor_id ?? "system"}
                    </div>
                  </div>
                  <span className="rounded-md bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    Sent
                  </span>
                </div>
              </Card>
            );
          })}
      </div>
    </DashboardLayout>
  );
}
