"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Avatar, Card, StatCard, VerifiedBadge } from "@/components/ui";
import { useAuthStore } from "@/hooks/useAuthStore";
import { api } from "@/lib/api";

const NAV = [
  { href: "/applicant", label: "Dashboard", icon: "Overview" },
  { href: "/applicant/documents", label: "My Documents", icon: "Documents" },
  { href: "/applicant/applications", label: "Job Apps", icon: "Applications" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/applicant/profile", label: "Profile", icon: "Profile" },
];

export default function ApplicantOverview() {
  const { user } = useAuthStore();
  const [apps, setApps] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.applications.mine(), api.documents.list()])
      .then(([a, d]) => { setApps(a.applications); setDocs(d.documents); })
      .finally(() => setLoading(false));
  }, []);

  const verifiedDocs = docs.filter((doc) => doc.verification_status === "approved").length;
  const upcomingInt = apps.find((app) => app.status === "interview");

  return (
    <DashboardLayout
      title="Applicant Screen"
      subtitle="Main Workspace / Documents List"
      nav={NAV}
      backgroundImage="/dashboard-backgrounds/applicant.jpg"
    >
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user?.fullName ?? "Applicant"} size={56} />
        <div>
          <h1 className="font-sora text-2xl font-extrabold text-[var(--fg)]">
            Welcome back, {(user?.fullName ?? "Applicant").split(" ")[0]}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-[var(--fg-muted)]">Full-Stack Developer - Harare</span>
            {verifiedDocs > 0 && <VerifiedBadge />}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon="Applications" label="Applications" value={String(apps.length)} />
        <StatCard icon="Verified Docs" label="Verified Docs" value={`${verifiedDocs}/${docs.length}`} sub={docs.some((doc) => doc.verification_status === "pending") ? "1 pending" : undefined} warn />
        <StatCard icon="Interviews" label="Interviews" value={String(apps.filter((app) => app.status === "interview").length)} />
        <StatCard icon="Profile Views" label="Profile Views" value="47" sub="This week" />
      </div>

      {upcomingInt && (
        <Card className="mb-6 flex items-center gap-4 border-l-4 border-l-[var(--primary)] p-4">
          <AppIcon name="calendar" size={24} className="text-[var(--primary)]" />
          <div className="flex-1">
            <div className="font-semibold text-[var(--fg)]">Interview at {upcomingInt.company_name}</div>
            <div className="text-sm text-[var(--fg-muted)]">{upcomingInt.job_title} - {upcomingInt.scheduled_at ?? "Time TBC"}</div>
          </div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Confirmed</span>
        </Card>
      )}

      <Card className="wire-panel overflow-hidden p-0">
        <h3 className="wire-title">Main Workspace / Documents List</h3>
        <div className="p-5">
          <h4 className="mb-4 font-sora text-base font-bold text-[var(--fg)]">Recent Applications</h4>
          {loading && <div className="text-sm text-[var(--fg-muted)]">Loading...</div>}
          {!loading && apps.slice(0, 3).map((app) => (
            <div key={app.id} className="flex items-center gap-3 border-b border-[var(--border)] py-3 last:border-0">
              <AppIcon name="jobs" size={24} className="text-[var(--primary)]" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-[var(--fg)]">{app.job_title}</div>
                <div className="text-xs text-[var(--fg-muted)]">{app.company_name}</div>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{app.status}</span>
            </div>
          ))}
          {!loading && apps.length === 0 && (
            <p className="text-sm text-[var(--fg-muted)]">No applications yet. <a href="/jobs" className="font-semibold text-[var(--primary)] hover:underline">Browse jobs</a></p>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
