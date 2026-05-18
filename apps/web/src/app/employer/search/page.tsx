"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, Card, SectionHeader, Spinner, VerifiedBadge } from "@/components/ui";
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

export default function EmployerSearchPage() {
  const [query, setQuery] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.jobs.candidates()
      .then(({ candidates }) => setCandidates(candidates))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const skills: string[] = typeof candidate.skills === "string" ? JSON.parse(candidate.skills || "[]") : (candidate.skills ?? []);
      const text = `${candidate.full_name} ${candidate.headline ?? ""} ${candidate.location ?? ""} ${skills.join(" ")}`.toLowerCase();
      return (!q || text.includes(q)) && (!verifiedOnly || candidate.verified_docs > 0);
    });
  }, [candidates, query, verifiedOnly]);

  return (
    <DashboardLayout title="Employer Dashboard" nav={NAV} variant="dark">
      <SectionHeader title="Search Candidates" subtitle="Find applicants by skill, title, location, or verification status" />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for React, compliance, Harare..."
            className="input"
          />
          <label className="flex items-center gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--fg)]">
            <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} />
            Verified credentials
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size={24} /></div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((candidate) => (
          <Card key={candidate.application_id} className="p-5">
            <div className="flex gap-4">
              <Avatar name={candidate.full_name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-sora text-base font-bold text-[var(--fg)]">{candidate.full_name}</h3>
                  {candidate.verified_docs > 0 && <VerifiedBadge />}
                </div>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">{candidate.headline ?? "Applicant"} - {candidate.location ?? "Location not set"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(typeof candidate.skills === "string" ? JSON.parse(candidate.skills || "[]") : (candidate.skills ?? [])).map((skill: string) => (
                    <span key={skill} className="rounded-md bg-[var(--muted)] px-2 py-1 text-xs font-semibold text-[var(--fg)]">
                      {skill}
                    </span>
                  ))}
                </div>
                <Link href="/employer/candidates" className="mt-4 inline-flex rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--fg)] hover:bg-[var(--muted)]">
                  View Candidate
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}
    </DashboardLayout>
  );
}
