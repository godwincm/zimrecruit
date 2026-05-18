"use client";

import { ProfileEditor } from "@/components/ProfileEditor";

const NAV = [
  { href: "/applicant", label: "Dashboard", icon: "Overview" },
  { href: "/applicant/documents", label: "My Documents", icon: "Documents" },
  { href: "/applicant/applications", label: "Job Apps", icon: "Applications" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/applicant/profile", label: "Profile", icon: "Profile" },
];

export default function ApplicantProfilePage() {
  return (
    <ProfileEditor
      role="applicant"
      title="Applicant Profile"
      subtitle="Edit applicant profile and profile picture"
      nav={NAV}
    />
  );
}
