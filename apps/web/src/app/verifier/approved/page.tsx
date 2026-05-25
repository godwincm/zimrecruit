"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, DocTypePill, SectionHeader, Spinner, StatusPill, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const NAV = [
  { href: "/verifier", label: "Pending Requests", icon: "Queue" },
  { href: "/verifier/approved", label: "Approved / Rejected", icon: "Done" },
  { href: "/verifier/profile", label: "Profile", icon: "Profile" },
];

export default function ApprovedRejectedPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    api.verifications.processed()
      .then(({ requests }) => setRequests(requests))
      .catch((err: any) => toast.error(err.message ?? "Could not load processed requests."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((item) => {
    const matchesText = `${item.applicant_name} ${item.title}`.toLowerCase().includes(search.toLowerCase());
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

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center gap-3 p-6 text-[var(--fg-muted)]">
          <AppIcon name="Done" size={40} />
          <p className="font-semibold text-[var(--fg)]">No processed requests found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--fg)]">{item.applicant_name}</span>
                    <DocTypePill type={item.doc_type} />
                    <StatusPill status={item.status} />
                    {item.status === "approved" && <VerifiedBadge />}
                  </div>
                  <p className="text-sm text-[var(--fg-muted)] mt-0.5">{item.title}</p>
                  <p className="text-xs text-[var(--fg-hint)] mt-1">{item.institution_name}</p>
                  <div className="mt-1.5 font-mono text-xs text-[var(--fg-hint)] break-all">
                    {item.status === "approved"
                      ? `Receipt: ${item.receipt_hash ?? "pending"} - Ledger #${item.sequence_number ?? "-"} - ${new Date(item.decided_at ?? item.attested_at).toLocaleDateString("en-ZW")}`
                      : `Reason: ${item.reason ?? "No reason recorded"} - ${new Date(item.decided_at ?? item.submitted_at).toLocaleDateString("en-ZW")}`}
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
