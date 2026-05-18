"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AppIcon, Card, StatusPill, VerifiedBadge, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import toast from "react-hot-toast";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { user } = useAuthStore();
  const router = useRouter();

  const [job,      setJob]      = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [applying, setApplying] = useState(false);
  const [cover,    setCover]    = useState("");

  useEffect(() => {
    api.jobs.get(id).then((result: any) => setJob(result.job)).finally(() => setLoading(false));
  }, [id]);

  const apply = async () => {
    if (!user) { router.push("/auth/login?from=/jobs/" + id); return; }
    if (!user.roles.includes("applicant")) {
      toast.error("Only applicants can apply for jobs."); return;
    }
    setApplying(true);
    try {
      await api.applications.apply({ jobId: id, coverLetter: cover || undefined });
      toast.success("Application submitted!");
      router.push("/applicant/applications");
    } catch (err: any) {
      toast.error(err.message ?? "Application failed.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return (
    <><Navbar />
    <div className="flex h-64 items-center justify-center"><Spinner size={36} /></div></>
  );

  if (!job) return (
    <><Navbar />
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
      <AppIcon name="Search" size={48} />
      <p className="text-lg font-semibold">Job not found</p>
    </div></>
  );

  const skills: string[] = typeof job.skills === "string" ? JSON.parse(job.skills) : (job.skills ?? []);
  const daysLeft = Math.max(0, Math.ceil((new Date(job.deadline).getTime() - Date.now()) / 86_400_000));

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">

          <div className="md:col-span-2 space-y-6">
            <Card className="p-8">
              {/* Header */}
              <div className="flex items-start gap-5 mb-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--muted)] text-3xl">
                  <AppIcon name="Jobs" size={30} /></div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h1 className="font-sora text-2xl font-extrabold text-[var(--fg)]">{job.title}</h1>
                    <StatusPill status={job.status} />
                  </div>
                  <p className="mt-1 text-[var(--fg-muted)]">{job.company_name}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--fg-muted)]">
                    {job.location && <span className="inline-flex items-center gap-1"><AppIcon name="Location" size={14} /> {job.location}</span>}
                    {job.type && <span className="inline-flex items-center gap-1"><AppIcon name="Calendar" size={14} /> {job.type}</span>}
                    {job.salary && <span className="inline-flex items-center gap-1"><AppIcon name="Jobs" size={14} /> {job.salary}</span>}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="font-sora text-lg font-bold text-[var(--fg)] mb-3">About the Role</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-muted)]">
                  {job.description}
                </p>
              </div>

              {/* Duties */}
              {job.duties && (
                <div className="mt-6">
                  <h2 className="font-sora text-lg font-bold text-[var(--fg)] mb-3">Key Duties</h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--fg-muted)]">{job.duties}</p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-sora text-lg font-bold text-[var(--fg)] mb-3">Required Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <span key={s} className="rounded-xl bg-[var(--muted)] px-3 py-1.5 text-sm font-medium text-[var(--fg)]">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Qualification */}
              {job.qualification && (
                <div className="mt-6 rounded-xl bg-[var(--muted)] p-4">
                  <span className="text-sm font-semibold text-[var(--fg)]">Minimum Qualification: </span>
                  <span className="text-sm text-[var(--fg-muted)]">{job.qualification}</span>
                </div>
              )}
            </Card>

            {/* Verified docs notice */}
            {job.verified_required && (
              <Card className="p-5 border-l-4 border-l-[var(--primary)] flex items-center gap-3">
                <VerifiedBadge size="md" />
                <p className="text-sm text-[var(--fg)]">
                  This employer requires <strong>verified documents</strong>. Ensure your credentials are attested before applying.{" "}
                  <a href="/applicant/documents" className="text-[var(--primary)] font-semibold hover:underline">Manage docs</a>
                </p>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-6 sticky top-24">
              <div className="mb-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--fg-muted)]">Applicants</span>
                  <span className="font-semibold text-[var(--fg)]">{job.applicant_count ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--fg-muted)]">Deadline</span>
                  <span className={`font-semibold ${daysLeft <= 3 ? "text-red-600" : "text-[var(--fg)]"}`}>
                    {daysLeft > 0 ? `${daysLeft} days left` : "Closing soon"}
                  </span>
                </div>
                {job.industry && (
                  <div className="flex justify-between">
                    <span className="text-[var(--fg-muted)]">Industry</span>
                    <span className="font-semibold text-[var(--fg)]">{job.industry}</span>
                  </div>
                )}
                {job.website && (
                  <div className="flex justify-between">
                    <span className="text-[var(--fg-muted)]">Company site</span>
                    <a href={job.website} target="_blank" rel="noreferrer"
                       className="font-semibold text-[var(--primary)] hover:underline truncate max-w-[120px]">
                      {job.website.replace(/^https:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="label">Cover Letter (optional)</label>
                <textarea
                  value={cover}
                  onChange={e => setCover(e.target.value)}
                  rows={5}
                  placeholder="Briefly introduce yourself and why you're a great fit..."
                  className="input resize-none"
                />
              </div>

              <button
                onClick={apply}
                disabled={applying || job.status !== "open"}
                className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60"
              >
                {applying ? <Spinner size={18} /> : job.status === "open" ? "Apply Now" : "Position Closed"}
              </button>

              {!user && (
                <p className="mt-3 text-center text-xs text-[var(--fg-muted)]">
                  <a href="/auth/login" className="text-[var(--primary)] font-semibold hover:underline">Log in</a> or{" "}
                  <a href="/auth/register" className="text-[var(--primary)] font-semibold hover:underline">register</a> to apply
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
