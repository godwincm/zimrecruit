"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, DocTypePill, SectionHeader, StatusPill, VerifiedBadge } from "@/components/ui";

const NAV = [
  { href: "/verifier", label: "Pending Requests", icon: "Queue" },
  { href: "/verifier/approved", label: "Approved / Rejected", icon: "Done" },
  { href: "/verifier/profile", label: "Profile", icon: "Profile" },
];

const REQUESTS = [
  { id: "a1", applicant: "Tendai Mupfumira", docType: "education", title: "BSc Accounting - MSU 2024", status: "approved", txHash: "0x3fa2b9...e91c", blockNum: 131, date: "May 10, 2026" },
  { id: "a2", applicant: "Chido Mutasa", docType: "education", title: "BSc Computer Science - UZ 2023", status: "approved", txHash: "0x1ab2c3...d4e5", blockNum: 128, date: "May 8, 2026" },
  { id: "r1", applicant: "Blessing Nyoni", docType: "medical", title: "Medical Fitness Report", status: "rejected", reason: "Scan was unclear", date: "May 6, 2026" },
  { id: "r2", applicant: "Farai Chipungu", docType: "police_clearance", title: "Police Clearance Certificate", status: "rejected", reason: "Expired certificate", date: "May 4, 2026" },
];

export default function ApprovedRejectedPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = REQUESTS.filter((item) => {
    const matchesText = `${item.applicant} ${item.title}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || item.status === status;
    return matchesText && matchesStatus;
  });

  return (
    <DashboardLayout title="Verifier Dashboard" nav={NAV}>
      <SectionHeader title="Approved / Rejected Requests" subtitle="Processed verification requests from your institution" />

      <div className="mb-5 flex flex-wrap gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by applicant or document title..." className="input max-w-sm" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input max-w-48">
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(item => (
          <Card key={item.id} className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[var(--fg)]">{item.applicant}</span>
                  <DocTypePill type={item.docType} />
                  <StatusPill status={item.status} />
                  {item.status === "approved" && <VerifiedBadge />}
                </div>
                <p className="text-sm text-[var(--fg-muted)] mt-0.5">{item.title}</p>
                <div className="mt-1.5 font-mono text-xs text-[var(--fg-hint)]">
                  {item.status === "approved"
                    ? `Tx: ${item.txHash} - Block #${item.blockNum} - ${item.date}`
                    : `Reason: ${item.reason} - ${item.date}`}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
