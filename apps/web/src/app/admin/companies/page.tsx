"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, SectionHeader, Spinner, StatusPill } from "@/components/ui";
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.companies().then(({ companies }) => setCompanies(companies)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="Companies" subtitle="Employer organisations and hiring activity" />
      <Card className="wire-panel overflow-hidden">
        <table className="wire-table">
          <thead><tr><th>Company</th><th>Industry</th><th>Jobs</th><th>Status</th></tr></thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="text-center"><Spinner size={18} /></td></tr>
            )}
            {!loading && companies.map((company) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.industry}</td>
                <td>{company.jobs}</td>
                <td><StatusPill status={company.is_active ? (company.verified ? "verified" : "pending") : "inactive"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
