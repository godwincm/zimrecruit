"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, StatCard, StatusPill, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const NAV = [
  { href: "/employer", label: "Dashboard", icon: "Overview" },
  { href: "/employer/jobs", label: "Post Vacancy", icon: "Post Vacancy" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/search", label: "Search", icon: "Search" },
  { href: "/employer/candidates", label: "Candidates", icon: "Candidates" },
  { href: "/employer/reports", label: "Reports", icon: "Reports" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

const ACTIONS = [
  { href: "/employer/jobs", label: "Post Vacancy", icon: "Post Vacancy" },
  { href: "/employer/search", label: "Search", icon: "Search" },
  { href: "/employer/candidates", label: "Candidates", icon: "Candidates" },
  { href: "/employer/reports", label: "Reports", icon: "Reports" },
];

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.jobs
      .list()
      .then(({ jobs }) => setJobs(jobs))
      .finally(() => setLoading(false));
  }, []);

  const openJobs = jobs.filter((job) => job.status === "open");
  const totalApplicants = jobs.reduce((sum, job) => sum + Number(job.applicant_count ?? 0), 0);

  return (
    <DashboardLayout
      title="Employer Screen"
      subtitle="Talent Matching Workspace"
      nav={NAV}
      backgroundImage="/dashboard-backgrounds/employer.jpg"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Jobs" value={String(openJobs.length)} icon="Post Vacancy" />
        <StatCard label="Total Applicants" value={String(totalApplicants)} icon="Applicants" />
        <StatCard label="Shortlisted" value="8" icon="Candidates" />
        <StatCard label="Reports" value="3" icon="Reports" />
      </div>

      <Card className="wire-panel mt-6 overflow-hidden p-0">
        <h2 className="wire-title text-center">Talent Matching Workspace</h2>
        <div className="grid gap-4 p-5 md:grid-cols-4">
          {ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="wire-action min-h-24">
              <AppIcon name={action.icon} size={22} />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="font-sora text-lg font-bold text-[var(--fg)]">Vacancy Activity</h2>
          <Link href="/employer/post" className="btn-primary text-sm">
            <AppIcon name="Post Vacancy" size={16} />
            Create Vacancy
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="wire-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="font-semibold">{job.title}</td>
                    <td>{job.department ?? job.industry ?? "-"}</td>
                    <td>{job.applicant_count ?? 0}</td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td>{job.deadline ? new Date(job.deadline).toLocaleDateString("en-ZW") : "-"}</td>
                    <td>
                      <Link href={`/employer/pipeline?job=${job.id}`} className="text-sm font-bold text-[var(--primary)] hover:underline">
                        View Applicants
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
