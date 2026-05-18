"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AppIcon, Card, StatusPill, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { Search } from "lucide-react";

const INDUSTRIES = ["All", "Technology", "Finance", "Healthcare", "Engineering", "Education", "Agriculture", "Legal"];
const TYPES      = ["All", "Full-time", "Part-time", "Contract", "Internship"];

export default function JobsPage() {
  const [jobs,     setJobs]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [industry, setIndustry] = useState("All");
  const [type,     setType]     = useState("All");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const q: Record<string, string> = { status: "open" };
    if (industry !== "All") q.industry = industry;
    if (search)             q.search   = search;
    const { jobs } = await api.jobs.list(q);
    setJobs(jobs);
    setLoading(false);
  }, [industry, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchJobs, 350);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  const filtered = type === "All" ? jobs : jobs.filter(j => j.type === type);

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-sora text-4xl font-extrabold text-[var(--fg)]">Browse Jobs</h1>
          <p className="mt-2 text-[var(--fg-muted)]">{jobs.length} positions available across Zimbabwe</p>
        </div>

        {/* Search + filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-hint)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs or companies…"
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {INDUSTRIES.map(i => (
              <button key={i} onClick={() => setIndustry(i)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  industry === i
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--primary)]/40"
                }`}>
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* Job type sub-filter */}
        <div className="mb-6 flex gap-2">
          {TYPES.map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                type === t
                  ? "border-[var(--primary)] bg-[var(--primary-fade)] text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--primary)]/40"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center text-[var(--fg-muted)]">
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
            <AppIcon name="search" size={44} />
            <p className="text-lg font-semibold">No jobs found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </>
  );
}

function JobCard({ job }: { job: any }) {
  const skills: string[] = typeof job.skills === "string" ? JSON.parse(job.skills) : (job.skills ?? []);
  const daysLeft = Math.max(0, Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86_400_000));

  return (
    <Card hover className="p-6 flex gap-4">
      {/* Logo */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-2xl">
        <AppIcon name="jobs" size={22} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <Link href={`/jobs/${job.id}`} className="font-sora text-base font-bold text-[var(--fg)] hover:text-[var(--primary)] transition">
              {job.title}
            </Link>
            <p className="text-sm text-[var(--fg-muted)] mt-0.5">{job.company_name}</p>
          </div>
          <StatusPill status={job.status} />
        </div>

        <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--fg-muted)]">
          <span className="inline-flex items-center gap-1"><AppIcon name="location" size={13} /> {job.location ?? job.company_location ?? "Zimbabwe"}</span>
          {job.salary && <span>{job.salary}</span>}
          <span className={daysLeft <= 3 ? "text-red-600 font-semibold" : ""}>
            <AppIcon name="calendar" size={13} /> {daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}
          </span>
          {job.type && <span>{job.type}</span>}
        </div>

        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skills.slice(0, 4).map((s: string) => (
              <span key={s} className="rounded-md bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--fg)]">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--fg-muted)]">{job.applicant_count ?? 0} applicants</span>
            {job.verified_required && (
              <span className="rounded-full bg-[var(--primary-fade)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                Verified docs required
              </span>
            )}
          </div>
          <Link href={`/jobs/${job.id}`}
            className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-bold text-white hover:brightness-90 transition">
            Apply
          </Link>
        </div>
      </div>
    </Card>
  );
}

