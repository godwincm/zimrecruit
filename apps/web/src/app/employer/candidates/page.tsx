"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, Card, SectionHeader, Spinner, StatusPill, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";

const NAV = [
  { href: "/employer", label: "Overview", icon: "Home" },
  { href: "/employer/jobs", label: "My Jobs", icon: "Jobs" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/post", label: "Post Vacancy", icon: "Post" },
  { href: "/employer/pipeline", label: "View Applicants", icon: "Apps" },
  { href: "/employer/search", label: "Search", icon: "Find" },
  { href: "/employer/candidates", label: "Candidates", icon: "People" },
  { href: "/employer/reports", label: "Reports", icon: "Rpt" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.jobs.candidates().then(({ candidates }) => setCandidates(candidates)).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Employer Dashboard" nav={NAV} variant="dark">
      <SectionHeader title="Candidates" subtitle="Candidate shortlist, verification state, and hiring stage" />

      <Card className="wire-panel overflow-hidden">
        <table className="wire-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Location</th>
              <th>Verified Docs</th>
              <th>Status</th>
              <th>Skills</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="text-center"><Spinner size={18} /></td></tr>
            )}
            {!loading && candidates.map((candidate) => {
              const skills: string[] = typeof candidate.skills === "string" ? JSON.parse(candidate.skills || "[]") : (candidate.skills ?? []);
              return (
              <tr key={candidate.application_id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={candidate.full_name} size={34} />
                    <div>
                      <div className="font-bold">{candidate.full_name}</div>
                      <div className="text-xs text-[var(--fg-muted)]">{candidate.headline ?? "Applicant"}</div>
                    </div>
                  </div>
                </td>
                <td>{candidate.location ?? "-"}</td>
                <td>{candidate.verified_docs > 0 ? <VerifiedBadge /> : "Pending"}</td>
                <td><StatusPill status={candidate.status} /></td>
                <td>{skills.join(", ") || "-"}</td>
              </tr>
            )})}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
