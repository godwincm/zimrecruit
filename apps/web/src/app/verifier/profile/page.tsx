"use client";

import { ProfileEditor } from "@/components/ProfileEditor";

const NAV = [
  { href: "/verifier", label: "Dashboard", icon: "Overview" },
  { href: "/verifier", label: "Pending", icon: "Queue" },
  { href: "/verifier/approved", label: "Verified", icon: "Done" },
  { href: "/verifier/profile", label: "Profile", icon: "Profile" },
];

export default function VerifierProfilePage() {
  return (
    <ProfileEditor
      role="verifier"
      title="Verifier Institution Profile"
      subtitle="Edit institution profile and profile picture"
      nav={NAV}
    />
  );
}
