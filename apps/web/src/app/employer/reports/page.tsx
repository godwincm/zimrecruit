"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Spinner, StatusPill, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";

const NAV = [
  { href: "/employer", label: "Dashboard", icon: "Overview" },
  { href: "/employer/jobs", label: "Post Vacancy", icon: "Post" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/search", label: "Search", icon: "Find" },
  { href: "/employer/candidates", label: "Candidates", icon: "People" },
  { href: "/employer/reports", label: "Reports", icon: "Reports" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

export default function EmployerReportsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.jobs.list({ status: "open", limit: "100" }).then(({ jobs }) => setJobs(jobs)),
      api.jobs.candidates({ limit: "100" }).then(({ candidates }) => setCandidates(candidates)),
    ]).finally(() => setLoading(false));
  }, []);

  const selectedCandidate = candidates[0];
  const selectedJob = jobs[0];
  const outcomeRows = useMemo(() => candidates.slice(0, 25), [candidates]);

  return (
    <DashboardLayout title="Reports" subtitle="Applicant, verification, and recruitment outcomes" nav={NAV} variant="dark">
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={28} /></div>
      ) : (
        <div className="space-y-8">
          <section className="report-sheet">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <h2 className="font-sora text-xl font-extrabold">Applicant Verification Report</h2>
              <button type="button" onClick={() => window.print()} className="wire-button no-print">
                <AppIcon name="Documents" size={15} />
                Print PDF
              </button>
            </div>

            <div className="mt-4 max-w-xl border border-neutral-900">
              <h3 className="border-b border-neutral-900 px-2 py-1 font-sora text-sm font-bold">Candidate Details</h3>
              <dl className="grid grid-cols-[0.42fr_0.58fr] gap-y-2 p-2 text-sm">
                <dt>Full Name:</dt><dd>{selectedCandidate?.full_name ?? "No candidates yet"}</dd>
                <dt>Email:</dt><dd>{selectedCandidate?.email ?? "-"}</dd>
                <dt>Applied Role:</dt><dd>{selectedCandidate?.job_title ?? "-"}</dd>
                <dt>Status:</dt><dd>{selectedCandidate?.verified_docs > 0 ? <VerifiedBadge /> : "No verified credentials"}</dd>
              </dl>
            </div>
          </section>

          <section className="report-sheet">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <h2 className="font-sora text-xl font-extrabold">Recruitment Outcome Report</h2>
              <button type="button" onClick={() => window.print()} className="wire-button no-print">Print PDF</button>
            </div>

            <div className="mt-4 max-w-xl border border-neutral-900">
              <h3 className="border-b border-neutral-900 px-2 py-1 font-sora text-sm font-bold">Vacancy Details</h3>
              <dl className="grid grid-cols-[0.42fr_0.58fr] gap-y-2 p-2 text-sm">
                <dt>Job Title:</dt><dd>{selectedJob?.title ?? "No open vacancies"}</dd>
                <dt>Department:</dt><dd>{selectedJob?.department ?? selectedJob?.industry ?? "-"}</dd>
                <dt>Closing Date:</dt><dd>{selectedJob?.deadline ? new Date(selectedJob.deadline).toLocaleDateString("en-ZW") : "-"}</dd>
                <dt>Total Applicants:</dt><dd>{selectedJob?.applicant_count ?? 0}</dd>
              </dl>
            </div>

            <table className="wire-table mt-5">
              <thead>
                <tr>
                  <th>Applicant Name</th>
                  <th>Vacancy</th>
                  <th>Verification Status</th>
                  <th>Current Stage</th>
                </tr>
              </thead>
              <tbody>
                {outcomeRows.map((row) => (
                  <tr key={row.application_id}>
                    <td>{row.full_name}</td>
                    <td>{row.job_title}</td>
                    <td>{row.verified_docs > 0 ? <VerifiedBadge /> : "Pending"}</td>
                    <td><StatusPill status={row.status} /></td>
                  </tr>
                ))}
                {outcomeRows.length === 0 && (
                  <tr><td colSpan={4} className="text-center">No applications found.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
