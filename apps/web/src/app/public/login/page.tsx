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
import { accountEmailSchema, strongPasswordSchema } from "@/lib/authValidation";

const schema = z.object({
  email: accountEmailSchema,
  password: strongPasswordSchema,
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#10241b] px-4 py-10">
      <div className="absolute inset-0 bg-[url('/auth-background.jpg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60" />

      <header className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between sm:left-8 sm:right-8 sm:top-8">
        <Link href="/" className="shrink-0">
          <Logo />
          <span className="ml-10 block text-xs font-medium text-white/80">Verified Recruitment Platform</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="relative z-10 w-full max-w-md pt-24">
        <div className="card border-white/20 bg-white/92 p-6 shadow-card backdrop-blur-sm sm:p-8 dark:bg-[rgb(27_29_28_/_0.9)]">
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
              <p className="mt-1 text-xs text-[var(--fg-muted)]">Use your confirmed email and a 12+ character password with mixed characters.</p>
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
