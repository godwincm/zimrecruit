"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Spinner } from "@/components/ui";
import { useAuthStore, type Role } from "@/hooks/useAuthStore";
import { api } from "@/lib/api";
import { getMediaPreviewUrl, uploadMedia } from "@/lib/appwrite";

interface NavItem {
  href: string;
  label: string;
  icon?: string;
}

interface ProfileEditorProps {
  role: Exclude<Role, "admin">;
  title: string;
  subtitle: string;
  nav: NavItem[];
}

export function ProfileEditor({ role, title, subtitle, nav }: ProfileEditorProps) {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>();

  useEffect(() => {
    api.me.get().then(({ user: loadedUser, profile: loadedProfile }: { user: any; profile: any }) => {
      const p = loadedProfile ?? {};
      setProfile(p);
      setAvatarPreview(p.avatarPreviewUrl ?? getMediaPreviewUrl(loadedUser.avatar_file_id ?? loadedUser.avatarFileId));
      reset({
        fullName: loadedUser.full_name ?? loadedUser.fullName ?? "",
        phone: loadedUser.phone ?? "",
        headline: p.headline ?? "",
        bio: p.bio ?? "",
        location: p.location ?? p.companyLocation ?? "",
        companyName: p.company_name ?? p.companyName ?? "",
        industry: p.industry ?? "",
        website: p.website ?? "",
        institutionName: p.institution_name ?? p.name ?? "",
        institutionCategory: p.category ?? "education",
        institutionWallet: p.wallet_address ?? "",
        contactEmail: p.contact_email ?? loadedUser.email ?? "",
      });
    }).finally(() => setLoading(false));
  }, [reset]);

  const displayName = watch("fullName") || user?.fullName || "Profile";
  const roleLabel = useMemo(() => {
    if (role === "employer") return "Employer";
    if (role === "verifier") return "Verifier Institution";
    return "Applicant";
  }, [role]);

  const handleImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const { fileId, previewUrl } = await uploadMedia(file);
      setValue("avatarFileId", fileId);
      setAvatarPreview(previewUrl);
      toast.success("Profile picture ready. Save to apply it.");
    } catch (err: any) {
      toast.error(err.message ?? "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value === "" ? undefined : value]));
    try {
      await api.me.update(clean);
      if (user && clean.fullName) setUser({ ...user, fullName: String(clean.fullName) });
      setProfile((current: any) => ({ ...current, ...clean }));
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={title} subtitle={subtitle} nav={nav}>
        <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={title} subtitle={subtitle} nav={nav}>
      <div className="grid gap-6 lg:grid-cols-[0.35fr_0.65fr]">
        <Card className="overflow-hidden">
          <div className="h-24 bg-[var(--primary-fade)]" />
          <div className="p-5 pt-0">
            <div className="-mt-12 mb-4 flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--muted)] text-2xl font-bold text-[var(--primary)]">
                {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : displayName.slice(0, 2).toUpperCase()}
              </div>
              <label className="wire-button cursor-pointer">
                <AppIcon name="Profile" size={15} />
                {uploading ? "Uploading" : "Upload Picture"}
                <input type="file" accept="image/*" hidden onChange={(event) => handleImage(event.target.files?.[0])} />
              </label>
            </div>
            <h2 className="font-sora text-xl font-bold text-[var(--fg)]">{displayName}</h2>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">{roleLabel}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--fg-muted)]">
              {profile.bio || "Add profile details so the right people can understand this account at a glance."}
            </p>
          </div>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <input type="hidden" {...register("avatarFileId")} />
          <Card className="wire-panel overflow-hidden p-0">
            <h2 className="wire-title">Profile Details</h2>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <label className="label">Full Name</label>
                <input {...register("fullName")} className="wire-field w-full" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input {...register("phone")} className="wire-field w-full" placeholder="+263 77 000 0000" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Bio / Summary</label>
                <textarea {...register("bio")} rows={4} className="wire-field w-full resize-y" placeholder="Write a short profile summary..." />
              </div>
              {role === "applicant" && (
                <>
                  <div>
                    <label className="label">Professional Headline</label>
                    <input {...register("headline")} className="wire-field w-full" placeholder="Full-stack developer" />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input {...register("location")} className="wire-field w-full" placeholder="Harare, Zimbabwe" />
                  </div>
                </>
              )}
              {role === "employer" && (
                <>
                  <div>
                    <label className="label">Company Name</label>
                    <input {...register("companyName")} className="wire-field w-full" />
                  </div>
                  <div>
                    <label className="label">Industry</label>
                    <input {...register("industry")} className="wire-field w-full" />
                  </div>
                  <div>
                    <label className="label">Company Location</label>
                    <input {...register("companyLocation")} className="wire-field w-full" placeholder="Harare, Zimbabwe" />
                  </div>
                  <div>
                    <label className="label">Website</label>
                    <input {...register("website")} className="wire-field w-full" placeholder="https://example.co.zw" />
                  </div>
                </>
              )}
              {role === "verifier" && (
                <>
                  <div>
                    <label className="label">Institution Name</label>
                    <input {...register("institutionName")} className="wire-field w-full" />
                  </div>
                  <div>
                    <label className="label">Institution Category</label>
                    <select {...register("institutionCategory")} className="wire-field w-full">
                      <option value="education">Education</option>
                      <option value="medical">Medical</option>
                      <option value="zrp">Police Records</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Contact Email</label>
                    <input {...register("contactEmail")} className="wire-field w-full" placeholder="records@example.co.zw" />
                  </div>
                  <div>
                    <label className="label">Verifier Wallet</label>
                    <input {...register("institutionWallet")} className="wire-field w-full font-mono" placeholder="0x..." />
                  </div>
                </>
              )}
            </div>
          </Card>

          <button type="submit" disabled={saving || uploading} className="wire-button min-w-48">
            {saving ? <><Spinner size={15} /> Saving</> : "Save Profile"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
