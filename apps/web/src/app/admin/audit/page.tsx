"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, SectionHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

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

const ROLE_STYLE: Record<string, string> = {
  applicant: "bg-blue-50 text-blue-700",
  employer:  "bg-green-50 text-green-700",
  verifier:  "bg-orange-50 text-orange-700",
  admin:     "bg-purple-50 text-purple-700",
};

const ACTION_STYLE: Record<string, string> = {
  DOC_UPLOAD:          "bg-blue-50 text-blue-700",
  DOC_DELETE:          "bg-red-50 text-red-600",
  VERIFY_APPROVE:      "bg-green-50 text-green-700",
  VERIFY_REJECT:       "bg-red-50 text-red-700",
  VERIFY_REVOKE:       "bg-orange-50 text-orange-700",
  JOB_POST:            "bg-purple-50 text-purple-700",
  JOB_APPLY:           "bg-yellow-50 text-yellow-700",
  APP_STAGE_CHANGE:    "bg-indigo-50 text-indigo-700",
  INTERVIEW_SCHEDULE:  "bg-teal-50 text-teal-700",
  INSTITUTION_ONBOARD: "bg-emerald-50 text-emerald-700",
  INSTITUTION_SUSPEND: "bg-orange-50 text-orange-700",
  AUTH_LOGIN:          "bg-slate-50 text-slate-500",
  AUTH_LOGOUT:         "bg-slate-50 text-slate-500",
  USER_REGISTER:       "bg-cyan-50 text-cyan-700",
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const q: Record<string, string> = {
      limit:  String(PAGE_SIZE),
      offset: String(reset ? 0 : offset),
    };
    if (filterAction) q.action = filterAction;
    if (filterEntity) q.entity = filterEntity;

    const { logs: newLogs } = await api.admin.audit(q);
    setLogs(prev => reset ? newLogs : [...prev, ...newLogs]);
    setHasMore(newLogs.length === PAGE_SIZE);
    if (!reset) setOffset(o => o + PAGE_SIZE);
    setLoading(false);
  }, [offset, filterAction, filterEntity]);

  useEffect(() => { setOffset(0); load(true); }, [filterAction, filterEntity]);

  const loadMore = () => { setOffset(o => o + PAGE_SIZE); load(); };

  const ACTIONS = [
    "DOC_UPLOAD","DOC_DELETE","VERIFY_APPROVE","VERIFY_REJECT","VERIFY_REVOKE",
    "JOB_POST","JOB_APPLY","APP_STAGE_CHANGE","INTERVIEW_SCHEDULE",
    "INSTITUTION_ONBOARD","INSTITUTION_SUSPEND","AUTH_LOGIN","USER_REGISTER",
  ];

  const ENTITIES = ["documents","verification_requests","jobs","applications",
                    "interviews","institutions","users","audit_logs"];

  return (
    <DashboardLayout title="Admin Console" nav={[...NAV, ...ADMIN_EXTRA_NAV]}>
      <SectionHeader title="Audit Log" subtitle="Tamper-evident, hash-chained event log for all platform actions" />

      {/* Filters */}
      <Card className="wire-panel mb-6 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-40">
            <label className="label text-xs">Filter by Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="input text-sm">
              <option value="">All Actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="label text-xs">Filter by Entity</label>
            <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="input text-sm">
              <option value="">All Entities</option>
              {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilterAction(""); setFilterEntity(""); }}
              className="btn-ghost text-sm py-2.5">Clear
            </button>
          </div>
        </div>
      </Card>

      {/* Hash-chain notice */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-900 dark:bg-green-950/30">
        <AppIcon name="Chain" size={18} className="text-green-600" />
        <p className="text-xs text-green-800 dark:text-green-300">
          Each row is hash-chained to the previous one: <span className="font-mono">row_hash = sha256(prev_hash + row_data)</span>.
          Tampering any row breaks the chain.
        </p>
      </div>

      {/* Log table */}
      <Card className="wire-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="wire-table">
            <thead>
              <tr>
                {["Time (CAT)", "Actor", "Role", "Action", "Entity", "Entity ID", "IP Address", ""].map(h => (
                  <th key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <Fragment key={log.id}>
                  <tr
                    className={`border-b border-[var(--border)] transition hover:bg-[var(--muted)] cursor-pointer ${
                      i % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--bg)]"
                    }`}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[var(--fg-muted)] whitespace-nowrap">
                      {new Date(log.created_at ?? log.timestamp).toLocaleString("en-ZW", { timeZone: "Africa/Harare" })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--fg)] max-w-[160px] truncate">
                      {log.actor_id ?? <span className="text-[var(--fg-muted)] italic">system</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor_role && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${ROLE_STYLE[log.actor_role] ?? "bg-slate-50 text-slate-500"}`}>
                          {log.actor_role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ACTION_STYLE[log.action] ?? "bg-slate-50 text-slate-500"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--fg-muted)]">{log.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--fg-muted)] max-w-[120px] truncate">
                      {log.entity_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--fg-muted)]">{log.ip_address}</td>
                    <td className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                      {expanded === log.id ? "Collapse" : "Expand"}
                    </td>
                  </tr>

                  {/* Expanded row — hash chain details */}
                  {expanded === log.id && (
                    <tr key={`${log.id}-expanded`} className="border-b border-[var(--border)] bg-[var(--muted)]">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid gap-3 md:grid-cols-2 text-xs">
                          <div>
                            <span className="font-semibold text-[var(--fg)]">Previous Hash</span>
                            <div className="mt-1 font-mono text-[var(--fg-muted)] break-all">{log.prev_hash ?? "genesis"}</div>
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--fg)]">Row Hash (sha256)</span>
                            <div className="mt-1 font-mono text-[var(--fg-muted)] break-all">{log.row_hash ?? log.receipt_hash ?? "-"}</div>
                          </div>
                          {log.metadata && Object.keys(JSON.parse(log.metadata || "{}")).length > 0 && (
                            <div className="md:col-span-2">
                              <span className="font-semibold text-[var(--fg)]">Metadata</span>
                              <pre className="mt-1 rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--fg-muted)] overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.metadata || "{}"), null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex h-16 items-center justify-center border-t border-[var(--border)]">
            <Spinner size={20} />
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="flex h-32 items-center justify-center text-[var(--fg-muted)]">
            <p className="text-sm">No audit events found matching your filters.</p>
          </div>
        )}

        {!loading && hasMore && (
          <div className="border-t border-[var(--border)] p-4 text-center">
            <button onClick={loadMore} className="btn-ghost text-sm">
              Load More
            </button>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

