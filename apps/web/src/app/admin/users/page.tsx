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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warningTarget, setWarningTarget] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin.users().then(({ users }) => setUsers(users)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Admin Console" nav={NAV}>
      <SectionHeader title="Users" subtitle="Applicants, employers, verifiers, and administrators" />
      {notice && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {notice}
        </div>
      )}

      <Card className="wire-panel overflow-hidden">
        <table className="wire-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center"><Spinner size={18} /></td></tr>
            )}
            {!loading && users.map((user) => (
              <tr key={user.id}>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td className="capitalize">{user.roles.join(", ")}</td>
                <td><StatusPill status={user.is_active ? "active" : "inactive"} /></td>
                <td>
                  {user.roles.includes("applicant") ? (
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50"
                      onClick={() => {
                        setWarningTarget(user);
                        setReason("");
                        setDetails("");
                        setNotice(null);
                        setError(null);
                      }}
                    >
                      Warn
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--fg-muted)]">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {warningTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-lg p-5">
            <div className="font-sora text-lg font-bold text-[var(--fg)]">
              Warn {warningTarget.full_name}
            </div>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setSubmitting(true);
                try {
                  await api.admin.warnUser(warningTarget.id, {
                    reason,
                    details: details.trim() || undefined,
                  });
                  setNotice(`Warning sent to ${warningTarget.full_name}.`);
                  setWarningTarget(null);
                  setError(null);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Warning could not be sent.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <label className="block text-sm font-semibold text-[var(--fg)]">
                Reason
                <input
                  className="input mt-1"
                  value={reason}
                  minLength={5}
                  maxLength={1000}
                  required
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--fg)]">
                Details
                <textarea
                  className="input mt-1 min-h-28"
                  value={details}
                  maxLength={2000}
                  onChange={(event) => setDetails(event.target.value)}
                />
              </label>
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-bold"
                  onClick={() => setWarningTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? "Sending" : "Send warning"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
