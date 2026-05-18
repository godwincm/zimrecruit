"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Lock, Mail } from "lucide-react";
import { Logo, PasswordInput, Spinner, ThemeToggle } from "@/components/ui";
import { useAuthStore } from "@/hooks/useAuthStore";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");

      const roles = useAuthStore.getState().user?.roles ?? [];
      const dashPath =
        roles.includes("admin") ? "/admin" :
        roles.includes("verifier") ? "/verifier" :
        roles.includes("employer") ? "/employer" :
        "/applicant";

      router.push(dashPath);
    } catch (err: any) {
      toast.error(err.message ?? "Login failed. Check your credentials.");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg)] px-4 py-10">
      <div className="pointer-events-none absolute -left-10 bottom-6 hidden h-72 w-72 rounded-full border border-[var(--border)] opacity-40 md:block" />
      <div className="pointer-events-none absolute -right-12 bottom-12 hidden h-64 w-64 rounded-full border border-[var(--border)] opacity-40 md:block" />

      <header className="absolute left-4 right-4 top-4 flex items-center justify-between sm:left-8 sm:right-8 sm:top-8">
        <Link href="/" className="shrink-0">
          <Logo />
          <span className="ml-10 block text-xs font-medium text-[var(--fg-muted)]">Verified Recruitment Platform</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="w-full max-w-md pt-24">
        <div className="card bg-[var(--surface-raised)] p-6 shadow-card sm:p-8">
          <div className="mb-8 text-center">
            <h1 className="font-sora text-2xl font-extrabold text-[var(--primary)]">Welcome back</h1>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">Sign in to your ZimRecruit account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-hint)]" size={18} />
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your email"
                  className="input pl-10"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--fg-hint)]" size={18} />
                <PasswordInput
                  {...register("password")}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="pl-10"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="text-right">
              <Link href="/auth/register" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                Forgot password
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-3 text-base">
              {isLoading ? <Spinner size={18} /> : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--fg-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-[var(--primary)] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
