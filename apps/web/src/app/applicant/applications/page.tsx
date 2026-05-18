"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Spinner, SectionHeader } from "@/components/ui";
import { api } from "@/lib/api";

const NAV = [
  { href: "/applicant",              label: "Overview",     icon: "Overview" },
  { href: "/applicant/documents",    label: "Documents",    icon: "Documents" },
  { href: "/applicant/applications", label: "Applications", icon: "Applications" },
  { href: "/jobs",                   label: "Jobs",         icon: "Jobs" },
  { href: "/applicant/profile",      label: "My Profile",   icon: "My Profile" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  applied:     { bg: "bg-blue-50",   text: "text-blue-700",   label: "Applied"     },
  shortlisted: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Shortlisted" },
  interview:   { bg: "bg-green-50",  text: "text-green-700",  label: "Interview"   },
  offer:       { bg: "bg-indigo-50", text: "text-indigo-700", label: "Offer"       },
  rejected:    { bg: "bg-red-50",    text: "text-red-700",    label: "Not Selected"},
  withdrawn:   { bg: "bg-slate-50",  text: "text-slate-500",  label: "Withdrawn"   },
};

// Progress pipeline order
const PIPELINE_STEPS = ["applied", "shortlisted", "interview", "offer"];

export default function ApplicationsPage() {
  const [apps,    setApps]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    api.applications.mine().then(({ applications }: { applications: any[] }) => setApps(applications)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);

  return (
    <DashboardLayout title="Applicant Dashboard" nav={NAV}>
      <SectionHeader title="My Applications" subtitle={`${apps.length} total applications`} />

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {["all", "applied", "shortlisted", "interview", "offer", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition capitalize ${
              filter === f
                ? "border-[var(--primary)] bg-[var(--primary-fade)] text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--primary)]/40"
            }`}>
            {f === "all" ? `All (${apps.length})` : `${f} (${apps.filter(a => a.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
          <AppIcon name="applications" size={44} />
          <p className="text-lg font-semibold">No applications</p>
          <Link href="/jobs" className="text-sm text-[var(--primary)] font-semibold hover:underline">
            Browse open positions
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => {
            const st = STATUS_STYLE[app.status] ?? STATUS_STYLE.applied;
            const stepIdx = PIPELINE_STEPS.indexOf(app.status);

            return (
              <Card key={app.id} className="p-6">
                <div className="flex gap-4 items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-2xl">
                    <AppIcon name="jobs" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-sora text-base font-bold text-[var(--fg)]">{app.job_title}</h3>
                        <p className="text-sm text-[var(--fg-muted)] mt-0.5">
                          {app.company_name}
                          {app.location && ` · ${app.location}`}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    {/* Pipeline progress */}
                    {stepIdx >= 0 && app.status !== "withdrawn" && app.status !== "rejected" && (
                      <div className="mt-4">
                        <div className="flex items-center gap-0">
                          {PIPELINE_STEPS.map((step, i) => {
                            const done = i <= stepIdx;
                            return (
                              <div key={step} className="flex flex-1 items-center">
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                                  done ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] text-[var(--fg-muted)]"
                                }`}>
                                  {done ? "Done" : i + 1}
                                </div>
                                {i < PIPELINE_STEPS.length - 1 && (
                                  <div className={`h-0.5 flex-1 transition ${i < stepIdx ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-[var(--fg-muted)] capitalize">
                          {PIPELINE_STEPS.map(s => <span key={s}>{s}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Interview info */}
                    {app.scheduled_at && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 dark:bg-green-950/30">
                        <AppIcon name="calendar" size={16} />
                        <div>
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400">Interview: </span>
                          <span className="text-sm text-green-800 dark:text-green-300">
                            {new Date(app.scheduled_at).toLocaleString("en-ZW")}
                          </span>
                          {app.interview_location && <span className="text-sm text-green-700 dark:text-green-300"> · {app.interview_location}</span>}
                        </div>
                      </div>
                    )}

                    <p className="mt-3 text-xs text-[var(--fg-hint)]">Applied {new Date(app.created_at).toLocaleDateString("en-ZW")}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
