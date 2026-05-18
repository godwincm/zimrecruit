"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Spinner, StatusPill } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const NAV = [
  { href: "/employer", label: "Dashboard", icon: "Overview" },
  { href: "/employer/jobs", label: "Post Vacancy", icon: "Post" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/search", label: "Search", icon: "Find" },
  { href: "/employer/candidates", label: "Candidates", icon: "People" },
  { href: "/employer/reports", label: "Reports", icon: "Reports" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [closing, setClosing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.jobs.list().then(({ jobs }: { jobs: any[] }) => setJobs(jobs)).finally(() => setLoading(false));
  }, []);

  const closeJob = async (id: string) => {
    setClosing(id);
    try {
      await api.jobs.update(id, { status: "closed" });
      setJobs((prev) => prev.map((job) => job.id === id ? { ...job, status: "closed" } : job));
      toast.success("Vacancy closed.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not close vacancy.");
    } finally {
      setClosing(null);
    }
  };

  const selectedJob = jobs[0];

  return (
    <DashboardLayout title="Post Vacancy (Employer)" subtitle="Create, edit, close vacancy, view applications" nav={NAV} variant="dark">
      <div className="mx-auto max-w-5xl">
        <Card className="wire-panel overflow-hidden p-0">
          <h2 className="wire-title text-center">Post Vacancy (Employer)</h2>
          <div className="grid gap-7 p-6">
            <Link href="/employer/post" className="wire-action">
              <AppIcon name="Post" size={24} />
              Create New Vacancy
            </Link>
            <Link href={selectedJob ? `/employer/post?edit=${selectedJob.id}` : "/employer/post"} className="wire-action">
              <AppIcon name="Jobs" size={24} />
              Edit Vacancy
            </Link>
            <button type="button" onClick={() => selectedJob && closeJob(selectedJob.id)} disabled={!selectedJob || closing === selectedJob.id} className="wire-action disabled:cursor-not-allowed disabled:opacity-60">
              {closing ? <Spinner size={18} /> : <AppIcon name="Close" size={24} />}
              Close Vacancy
            </button>
            <Link href={selectedJob ? `/employer/pipeline?job=${selectedJob.id}` : "/employer/pipeline"} className="wire-action">
              <AppIcon name="Applications" size={24} />
              View Applications
            </Link>
          </div>
        </Card>

        <Card className="wire-panel mt-6 overflow-hidden p-0">
          <h2 className="wire-title">Vacancy List</h2>
          {loading ? (
            <div className="flex h-28 items-center justify-center"><Spinner /></div>
          ) : (
            <table className="wire-table">
              <thead>
                <tr>
                  <th>Vacancy</th>
                  <th>Department</th>
                  <th>Applicants</th>
                  <th>Status</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="font-semibold">{job.title}</td>
                    <td>{job.department ?? job.industry}</td>
                    <td>{job.applicant_count ?? 0}</td>
                    <td><StatusPill status={job.status} /></td>
                    <td>{new Date(job.deadline).toLocaleDateString("en-ZW")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
