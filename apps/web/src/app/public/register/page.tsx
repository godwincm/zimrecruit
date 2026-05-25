"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Logo, PasswordInput, Spinner, ThemeToggle } from "@/components/ui";
import { useAuthStore } from "@/hooks/useAuthStore";
import { accountEmailSchema, strongPasswordSchema } from "@/lib/authValidation";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  nationalId: z.string().min(6, "Enter national ID").optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  email: accountEmailSchema,
  password: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your password"),
  role: z.enum(["applicant", "verifier", "employer"]),
  companyName: z.string().optional(),
  institutionName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords must match",
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "applicant" },
  });

  const role = watch("role");

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
        phone: "",
        companyName: data.companyName ?? "",
        companyLocation: "Zimbabwe",
        industry: "",
        website: "",
        institutionName: data.institutionName ?? "",
        institutionCategory: "education",
      });
      toast.success("Account created! Welcome to ZimRecruit.");
      router.push(data.role === "employer" ? "/employer" : data.role === "verifier" ? "/verifier" : "/applicant");
    } catch (err: any) {
      toast.error(err.message ?? "Registration failed.");
    }
  };

  const Err = ({ name }: { name: keyof FormData }) => {
    const message = errors[name]?.message;
    return message ? <p className="mt-1 text-xs text-red-600">{String(message)}</p> : null;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10241b] px-4 py-8">
      <div className="absolute inset-0 bg-[url('/auth-background.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="shrink-0">
          <Logo />
          <span className="ml-10 block text-xs font-medium text-white/80">Verified Recruitment Platform</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="relative z-10 mx-auto mt-8 max-w-5xl">
        <form onSubmit={handleSubmit(onSubmit)} className="wire-panel overflow-hidden border-white/20 bg-white/92 backdrop-blur-sm dark:bg-[rgb(21_23_22_/_0.9)]">
          <h1 className="wire-title flex items-center gap-2 text-lg normal-case">
            Applicant Account Creation
          </h1>

          <div className="grid gap-4 p-5 md:grid-cols-[0.45fr_0.55fr]">
            <label className="label">Full Name:</label>
            <div>
              <input {...register("fullName")} className="wire-field w-full" placeholder="Enter your full name" />
              <Err name="fullName" />
            </div>

            <label className="label">National ID:</label>
            <div>
              <input {...register("nationalId")} className="wire-field w-full" placeholder="XX-XXXXXXX-X-XX" />
              <Err name="nationalId" />
            </div>

            <label className="label">Date of Birth:</label>
            <input {...register("dateOfBirth")} className="wire-field" placeholder="DD/MM/YYYY" />

            <label className="label">Email Address:</label>
            <div>
              <input {...register("email")} type="email" className="wire-field w-full" placeholder="example@domain.co.zw" />
              <Err name="email" />
            </div>

            <label className="label">Password:</label>
            <div>
              <PasswordInput {...register("password")} className="wire-field rounded-none" placeholder="***" />
              <Err name="password" />
              <p className="mt-1 text-xs text-[var(--fg-muted)]">Use 12+ characters with upper/lowercase letters, a number, and a symbol.</p>
            </div>

            <label className="label">Confirm Password:</label>
            <div>
              <PasswordInput {...register("confirmPassword")} className="wire-field rounded-none" placeholder="***" />
              <Err name="confirmPassword" />
            </div>

            <label className="label">Role Selection:</label>
            <select {...register("role")} className="wire-field w-fit min-w-56">
              <option value="applicant">Applicant</option>
              <option value="verifier">Verifier Institution</option>
              <option value="employer">Employer</option>
            </select>

            {role === "employer" && (
              <>
                <label className="label">Company Name:</label>
                <input {...register("companyName")} className="wire-field" placeholder="Enter company name" />
              </>
            )}

            {role === "verifier" && (
              <>
                <label className="label">Institution Name:</label>
                <input {...register("institutionName")} className="wire-field" placeholder="Enter verifier institution name" />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-900 p-5 dark:border-[var(--border)]">
            <button type="submit" disabled={isLoading} className="wire-button min-w-72">
              {isLoading ? <Spinner size={15} /> : "Register Account"}
            </button>
            <Link href="/auth/login" className="text-sm font-semibold text-[var(--primary)] hover:underline">
              Already have an account? Log in
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
