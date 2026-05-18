"use client";

import { ProfileEditor } from "@/components/ProfileEditor";

const NAV = [
  { href: "/employer", label: "Dashboard", icon: "Overview" },
  { href: "/employer/jobs", label: "Post Vacancy", icon: "Post Vacancy" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/employer/search", label: "Search", icon: "Search" },
  { href: "/employer/candidates", label: "Candidates", icon: "Candidates" },
  { href: "/employer/reports", label: "Reports", icon: "Reports" },
  { href: "/employer/profile", label: "Profile", icon: "Profile" },
];

export default function EmployerProfilePage() {
  return (
    <ProfileEditor
      role="employer"
      title="Employer Profile"
      subtitle="Edit company profile and profile picture"
      nav={NAV}
    />
  );
}
