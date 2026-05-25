import Link from "next/link";
import { Navbar } from "../components/Navbar";
import { AppIcon, VerifiedBadge } from "../components/ui";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-green-50 to-yellow-50 dark:from-[#0a0a0a] dark:via-[#0f1a12] dark:to-[#0a0a0a] px-6 py-24 md:py-32">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-2 md:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 dark:border-green-900 dark:bg-green-950">
                <span className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-400">
                  Verified Hiring - Zimbabwe
                </span>
              </div>
              <h1 className="font-sora text-5xl font-extrabold leading-tight tracking-tight text-[var(--fg)] md:text-6xl">
                Hire with{" "}
                <span className="text-[var(--primary)]">verified</span>
                <br />
                <span className="text-[#d4af37]">confidence</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--fg-muted)]">
                ZimRecruit connects Zimbabwean job seekers, employers, and accredited institutions on a platform where every credential carries a trusted proof of authenticity.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/jobs" className="btn-primary text-base px-7 py-3">
                  Browse Jobs
                </Link>
                <Link href="/verify" className="btn-ghost text-base px-7 py-3">
                  Verify a Document
                </Link>
              </div>
            </div>

            {/* Hero card */}
            <div className="relative">
              <div className="card p-6 shadow-card-lg">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] font-sora text-xl font-bold text-white">CM</div>
                  <div>
                    <div className="font-sora text-lg font-bold text-[var(--fg)]">Chido Mutasa</div>
                    <div className="text-sm text-[var(--fg-muted)]">Full-Stack Developer - Harare</div>
                    <VerifiedBadge />
                  </div>
                </div>
                <div className="border-t border-[var(--border)] pt-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Verified Credentials</div>
                  {[
                    { icon: "education", label: "BSc Computer Science — UZ" },
                    { icon: "police", label: "ZRP Police Clearance" },
                    { icon: "medical", label: "Medical Fitness Certificate" },
                  ].map(({ icon, label }, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[var(--muted)] py-2.5 last:border-0">
                      <span className="flex items-center gap-2 text-sm text-[var(--fg)]"><AppIcon name={icon} size={16} /> {label}</span>
                      <VerifiedBadge />
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-[var(--muted)] p-3 font-mono text-xs text-[var(--fg-muted)]">
                  <span className="font-bold not-italic">Supabase Ledger - Receipt #114</span>
                  <br />0x3fa2b9c1e91c4d8a...
                </div>
              </div>
              <div className="absolute -right-4 -top-4 rounded-2xl bg-[#d4af37] px-4 py-2 text-sm font-bold text-black shadow-lg">
                3/3 Docs Verified
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────── */}
        <section className="bg-[var(--primary)] py-12 px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { v: "12,400+", l: "Verified Credentials" },
              { v: "380+",    l: "Employers" },
              { v: "24,800+",l: "Registered Applicants" },
              { v: "3",       l: "Accredited Institutions" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-sora text-3xl font-extrabold text-white">{s.v}</div>
                <div className="mt-1 text-sm text-white/80">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section className="px-6 py-20 bg-[var(--bg)]">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">Process</div>
              <h2 className="font-sora text-4xl font-extrabold text-[var(--fg)]">How ZimRecruit Works</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                { n: "01", t: "Register & Profile",    d: "Sign up as applicant, employer, or institution. Role-based access from day one." },
                { n: "02", t: "Upload Documents",      d: "Submit academic certificates, police clearances, and medical reports to your secure vault." },
                { n: "03", t: "Receipt Attestation",  d: "Accredited verifiers record your document proof in the Supabase mockchain ledger." },
                { n: "04", t: "Apply with Confidence", d: "Your verified profile stands out. Employers see cryptographic proof — not paper promises." },
              ].map((s, i) => (
                <div key={i} className="card p-6">
                  <div className="font-sora text-5xl font-black text-[var(--primary)] opacity-15">{s.n}</div>
                  <h3 className="mt-1 font-sora text-base font-bold text-[var(--fg)]">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section className="bg-[var(--surface)] px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="mb-14 text-center">
              <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--primary)]">Features</div>
              <h2 className="font-sora text-4xl font-extrabold text-[var(--fg)]">Built for Trust. Designed for Zimbabwe.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: "chain", t: "Credential Verification",  d: "Documents carry tamper-evident proofs that are easy to audit." },
                { icon: "company", t: "Smart Recruitment",        d: "Employers access a pre-verified talent pool. No more chasing references." },
                { icon: "shield", t: "Role-Based Trust",         d: "Strict RBAC separates Applicants, Employers, Verifiers, and Admins." },
                { icon: "documents", t: "Document Registry",        d: "Police clearances, degrees, and medicals stored securely with verifiable proof records." },
                { icon: "activity", t: "30-Second Attestation",    d: "From upload to trusted proof in under 30 seconds - verification at the speed of hiring." },
                { icon: "shield", t: "Zimbabwe-Compliant",  d: "Aligned with the Zimbabwe Cyber and Data Protection Act (Ch. 12:07)." },
              ].map((f, i) => (
                <div key={i} className="card p-6">
                  <div className="mb-4 text-[var(--primary)]"><AppIcon name={f.icon} size={28} /></div>
                  <h3 className="mb-2 font-sora text-base font-bold text-[var(--fg)]">{f.t}</h3>
                  <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section className="px-6 py-20 text-center bg-[var(--bg)]">
          <div className="mx-auto max-w-xl">
            <h2 className="font-sora text-4xl font-extrabold text-[var(--fg)]">
              Ready to verify your credentials
            </h2>
            <p className="mt-4 text-base text-[var(--fg-muted)]">
              Join 24,800+ Zimbabweans building trust in their careers.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link href="/auth/register" className="btn-primary px-8 py-3 text-base">
                Get Started Free
              </Link>
              <Link href="/jobs" className="btn-ghost px-8 py-3 text-base">Browse Jobs</Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer className="border-t border-[var(--border)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--fg-muted)]">
            © 2025 ZimRecruit · Zimbabwe Cyber & Data Protection Act (Ch. 12:07)
          </p>
        </footer>
      </main>
    </>
  );
}
