"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, Spinner } from "@/components/ui";
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

const schema = z.object({
  title: z.string().min(3, "Enter a position title"),
  department: z.string().min(2, "Enter a department"),
  positions: z.coerce.number().min(1),
  qualification: z.string().min(2, "Select a minimum qualification"),
  policeClearance: z.enum(["yes", "no"]),
  medicalFitness: z.enum(["yes", "no"]),
  deadline: z.string().min(1, "Set an application deadline"),
  description: z.string().min(20, "Enter the role responsibilities"),
});

type FormData = z.infer<typeof schema>;

export default function PostJobPage() {
  const router = useRouter();
  const [posting, setPosting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      positions: 1,
      policeClearance: "yes",
      medicalFitness: "yes",
    },
  });

  const onSubmit = async (data: FormData) => {
    setPosting(true);
    try {
      await api.jobs.create({
        title: data.title,
        department: data.department,
        industry: data.department,
        applicant_count: 0,
        qualification: data.qualification,
        policeClearance: data.policeClearance === "yes",
        medicalFitness: data.medicalFitness === "yes",
        deadline: new Date(data.deadline).toISOString(),
        description: data.description,
        skills: [],
        type: "Full-time",
        location: "Zimbabwe",
      });
      toast.success("Vacancy posted successfully.");
      router.push("/employer/jobs");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post vacancy.");
    } finally {
      setPosting(false);
    }
  };

  const Err = ({ msg }: { msg?: string }) => msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

  return (
    <DashboardLayout title="Create New Job Vacancy" subtitle="Create job vacancy screen" nav={NAV} variant="dark">
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-5xl">
        <Card className="wire-panel overflow-hidden p-0">
          <h2 className="wire-title">Create New Job Vacancy</h2>
          <div className="grid gap-4 p-5 md:grid-cols-[0.42fr_0.58fr]">
            <label className="label">Job Title:</label>
            <div>
              <input {...register("title")} className="wire-field w-full" placeholder="Enter position title" />
              <Err msg={errors.title?.message} />
            </div>

            <label className="label">Department:</label>
            <div>
              <input {...register("department")} className="wire-field w-full" placeholder="Enter department name" />
              <Err msg={errors.department?.message} />
            </div>

            <label className="label">Number of Positions:</label>
            <input {...register("positions")} type="number" min={1} className="wire-field" />

            <label className="label">Min. Qualification:</label>
            <div>
              <select {...register("qualification")} className="wire-field w-full">
                <option value="">Select Minimum Degree/Diploma</option>
                <option value="Diploma">Diploma</option>
                <option value="Bachelor Degree">Bachelor Degree</option>
                <option value="Masters Degree">Masters Degree</option>
                <option value="Professional Certification">Professional Certification</option>
              </select>
              <Err msg={errors.qualification?.message} />
            </div>

            <label className="label">Police Clearance:</label>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2"><input {...register("policeClearance")} type="radio" value="yes" /> Yes</label>
              <label className="inline-flex items-center gap-2"><input {...register("policeClearance")} type="radio" value="no" /> No</label>
            </div>

            <label className="label">Medical Fitness:</label>
            <div className="flex items-center gap-5">
              <label className="inline-flex items-center gap-2"><input {...register("medicalFitness")} type="radio" value="yes" /> Yes</label>
              <label className="inline-flex items-center gap-2"><input {...register("medicalFitness")} type="radio" value="no" /> No</label>
            </div>

            <label className="label">Application Deadline:</label>
            <div>
              <input {...register("deadline")} type="date" min={new Date().toISOString().split("T")[0]} className="wire-field w-full" />
              <Err msg={errors.deadline?.message} />
            </div>

            <label className="label">Job Description:</label>
            <div>
              <textarea {...register("description")} rows={4} className="wire-field w-full resize-y" placeholder="Enter job roles and responsibilities..." />
              <Err msg={errors.description?.message} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-neutral-900 p-5 dark:border-[var(--border)]">
            <button type="submit" disabled={posting} className="wire-button min-w-64">
              {posting ? <><Spinner size={15} /> Posting</> : "Post Vacancy"}
            </button>
            <button type="button" onClick={() => router.push("/employer/jobs")} className="wire-button">Back</button>
          </div>
        </Card>
      </form>
    </DashboardLayout>
  );
}
