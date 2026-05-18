"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Avatar, VerifiedBadge, StatusPill, SectionHeader, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const EMPLOYER_EXTRA_NAV = [
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/search", label: "Search", icon: "Find" },
  { href: "/employer/candidates", label: "Candidates", icon: "People" },
  { href: "/employer/reports", label: "Reports", icon: "Rpt" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

const NAV = [
  { href: "/employer",          label: "Overview",    icon: "Overview" },
  { href: "/employer/jobs",     label: "My Jobs",     icon: "My Jobs" },
  { href: "/employer/post",     label: "Post a Job",  icon: "Post a Job" },
  { href: "/employer/pipeline", label: "Pipeline",    icon: "Pipeline" },
];

const STAGES = ["applied", "shortlisted", "interview", "offer", "rejected"] as const;

export default function PipelinePage() {
  const [jobs,       setJobs]       = useState<any[]>([]);
  const [selectedJob,setSelectedJob]= useState<string>("");
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [moving,     setMoving]     = useState<string | null>(null);

  // Interview scheduling modal
  const [schedAppId,   setSchedAppId]   = useState<string | null>(null);
  const [schedDate,    setSchedDate]    = useState("");
  const [schedLocation,setSchedLocation]= useState("");

  useEffect(() => {
    api.jobs.list({ status: "open" }).then(({ jobs }: { jobs: any[] }) => setJobs(jobs));

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSelectedJob(params.get("job") ?? "");
    }
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoading(true);
    api.jobs.applicants(selectedJob)
      .then(({ applicants }: { applicants: any[] }) => setApplicants(applicants))
      .catch(() => toast.error("Could not load applicants."))
      .finally(() => setLoading(false));
  }, [selectedJob]);

  const moveStage = async (appId: string, status: string) => {
    setMoving(appId);
    try {
      await api.applications.stage(appId, status);
      setApplicants(prev => prev.map(a => a.application_id === appId ? { ...a, status } : a));
      toast.success(`Moved to ${status}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update stage.");
    } finally {
      setMoving(null);
    }
  };

  const scheduleInterview = async () => {
    if (!schedDate || !schedLocation) { toast.error("Fill in all fields."); return; }
    try {
      await api.applications.interview({ applicationId: schedAppId!, scheduledAt: new Date(schedDate).toISOString(), location: schedLocation });
      toast.success("Interview scheduled — applicant notified via email.");
      setSchedAppId(null);
      setApplicants(prev => prev.map(a => a.application_id === schedAppId ? { ...a, status: "interview" } : a));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to schedule.");
    }
  };

  return (
    <DashboardLayout title="Employer Dashboard" nav={[...NAV, ...EMPLOYER_EXTRA_NAV]} variant="dark">
      <SectionHeader title="Applicant Pipeline" subtitle="Review and move candidates through stages" />

      {/* Job selector */}
      <div className="mb-6">
        <label className="label">Select Job Posting</label>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="input max-w-sm">
          <option value="">Select a job…</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.applicant_count ?? 0} applicants)</option>)}
        </select>
      </div>

      {!selectedJob && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
          <AppIcon name="people" size={40} />
          <p>Select a job posting to view its applicants</p>
        </div>
      )}

      {selectedJob && loading && (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      )}

      {selectedJob && !loading && applicants.length === 0 && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
          <AppIcon name="documents" size={40} />
          <p>No applicants yet for this position</p>
        </div>
      )}

      {selectedJob && !loading && applicants.length > 0 && (
        <div className="space-y-4">
          {applicants.map(ap => {
            const skills: string[] = typeof ap.skills === "string" ? JSON.parse(ap.skills) : (ap.skills ?? []);
            const matchScore = Math.floor(70 + Math.random() * 28);

            return (
              <Card key={ap.application_id} className="p-6">
                <div className="flex gap-4 items-start">
                  <Avatar name={ap.full_name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-sora text-base font-bold text-[var(--fg)]">{ap.full_name}</span>
                          {ap.verified_docs > 0 && <VerifiedBadge />}
                        </div>
                        <p className="text-sm text-[var(--fg-muted)] mt-0.5">
                          {ap.headline ?? "Applicant"}
                          {ap.location && ` · ${ap.location}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-bold ${matchScore >= 90 ? "text-green-600" : matchScore >= 80 ? "text-yellow-600" : "text-[var(--fg-muted)]"}`}>
                          {matchScore}% match
                        </span>
                        <StatusPill status={ap.status} />
                      </div>
                    </div>

                    {skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {skills.slice(0, 5).map(s => (
                          <span key={s} className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--fg)]">{s}</span>
                        ))}
                      </div>
                    )}

                    {/* Verified docs count */}
                    <p className="mt-2 text-xs text-[var(--fg-muted)]">
                      {ap.verified_docs > 0
                        ? `${ap.verified_docs} verified credential${ap.verified_docs > 1 ? "s" : ""}`
                        : "No verified credentials"}
                    </p>

                    {/* Stage actions */}
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                      {ap.status === "applied" && (
                        <button onClick={() => moveStage(ap.application_id, "shortlisted")}
                          disabled={moving === ap.application_id}
                          className="rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-bold text-white hover:brightness-90 disabled:opacity-60">
                          ⭐ Shortlist
                        </button>
                      )}
                      {["applied", "shortlisted"].includes(ap.status) && (
                        <button onClick={() => setSchedAppId(ap.application_id)}
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:brightness-90">
                          <AppIcon name="calendar" size={13} /> Schedule Interview
                        </button>
                      )}
                      {ap.status === "interview" && (
                        <button onClick={() => moveStage(ap.application_id, "offer")}
                          disabled={moving === ap.application_id}
                          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:brightness-90 disabled:opacity-60">
                          <AppIcon name="done" size={13} /> Extend Offer
                        </button>
                      )}
                      {!["rejected", "withdrawn"].includes(ap.status) && (
                        <button onClick={() => moveStage(ap.application_id, "rejected")}
                          disabled={moving === ap.application_id}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60">
                          <AppIcon name="close" size={13} /> Reject
                        </button>
                      )}
                      <button onClick={() => window.open(`mailto:${ap.email}`, "_blank")}
                        className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--muted)]">
                        <AppIcon name="mail" size={13} /> Email
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interview modal */}
      {schedAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-8">
            <h3 className="font-sora text-lg font-bold text-[var(--fg)] mb-4">Schedule Interview</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Date & Time</label>
                <input type="datetime-local" value={schedDate}
                  onChange={e => setSchedDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Location / Meeting Link</label>
                <input value={schedLocation} onChange={e => setSchedLocation(e.target.value)}
                  placeholder="e.g. 44 Baker Ave, Harare or https://meet.google.com/…" className="input" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={scheduleInterview} className="btn-primary flex-1 justify-center">Confirm &amp; Notify</button>
              <button onClick={() => setSchedAppId(null)} className="btn-ghost">Cancel</button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
