"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, SectionHeader, StatusPill, Spinner } from "@/components/ui";
import { api } from "@/lib/api";

const ADMIN_EXTRA_NAV = [
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/system-health", label: "System Health", icon: "Health" },
  { href: "/admin/fraud-warnings", label: "Fraud Warnings", icon: "Warn" },
  { href: "/admin/companies", label: "Companies", icon: "Co" },
  { href: "/admin/supabase-ledger", label: "Supabase Ledger", icon: "Chain" },
];

const NAV = [
  { href: "/admin",              label: "Overview",     icon: "Overview" },
  { href: "/admin/institutions", label: "Institutions", icon: "Institutions" },
  { href: "/admin/audit",        label: "Audit Log",    icon: "Audit Log" },
];

const schema = z.object({
  name:          z.string().min(3),
  category:      z.enum(["zrp", "medical", "education"]),
  contactEmail:  z.string().email(),
});

type FormData = z.infer<typeof schema>;

const INST_ICON = { zrp: "police", medical: "medical", education: "education" } as const;

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toggling,     setToggling]     = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "education" },
  });

  const load = async () => {
    const { institutions } = await api.institutions.list();
    setInstitutions(institutions);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await api.institutions.create(data);
      toast.success("Institution onboarded!");
      reset(); setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create institution.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string) => {
    setToggling(id);
    try {
      await api.institutions.suspend(id);
      setInstitutions(prev => prev.map(i => i.id === id ? { ...i, is_active: !i.is_active } : i));
    } catch { toast.error("Failed to update status."); }
    finally { setToggling(null); }
  };

  const Err = ({ msg }: { msg?: string }) => msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null;

  return (
    <DashboardLayout title="Admin Console" nav={[...NAV, ...ADMIN_EXTRA_NAV]}>
      <SectionHeader
        title="Accredited Institutions"
        subtitle="Manage institutions authorised to verify documents"
        action={
          <button onClick={() => setShowForm(s => !s)} className="btn-primary">
            {showForm ? "Cancel" : "+ Onboard Institution"}
          </button>
        }
      />

      {/* Add form */}
      {showForm && (
        <Card className="mb-6 p-6">
          <h3 className="font-sora text-sm font-bold text-[var(--fg)] uppercase tracking-wide mb-4">New Institution</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Institution Name</label>
              <input {...register("name")} placeholder="University of Zimbabwe" className="input" />
              <Err msg={errors.name?.message} />
            </div>
            <div>
              <label className="label">Category</label>
              <select {...register("category")} className="input">
                <option value="education">Education</option>
                <option value="zrp">Police (ZRP)</option>
                <option value="medical">Medical</option>
              </select>
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input {...register("contactEmail")} type="email" placeholder="verify@institution.ac.zw" className="input" />
              <Err msg={errors.contactEmail?.message} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Spinner size={15} /> Saving...</> : "Onboard Institution"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Institutions list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>
      ) : (
        <div className="space-y-4">
          {institutions.map(inst => (
            <Card key={inst.id} className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-2xl">
                  <AppIcon name={INST_ICON[inst.category as keyof typeof INST_ICON] ?? "institutions"} size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-sora text-base font-bold text-[var(--fg)]">{inst.name}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[var(--fg-muted)] capitalize">{inst.category}</span>
                        <StatusPill status={inst.is_active ? "active" : "inactive"} />
                      </div>
                    </div>
                    <button
                      onClick={() => toggleStatus(inst.id)}
                      disabled={toggling === inst.id}
                      className={`shrink-0 rounded-xl border px-4 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                        inst.is_active
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {toggling === inst.id ? <Spinner size={12} /> : inst.is_active ? "Suspend" : "Reactivate"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--fg-muted)]">
                    <span className="inline-flex items-center gap-1"><AppIcon name="mail" size={13} /> {inst.contact_email}</span>
                    <span>Supabase mockchain verification enabled</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

