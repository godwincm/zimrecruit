"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, Avatar, DocTypePill, VerifiedBadge, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const VERIFIER_NAV = [
  { href: "/verifier", label: "Dashboard", icon: "Overview" },
  { href: "/verifier", label: "Pending", icon: "Queue" },
  { href: "/verifier/approved", label: "Verified", icon: "Done" },
  { href: "/verifier/profile", label: "Profile", icon: "Profile" },
];

export default function VerifierQueuePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = async () => {
    const { queue } = await api.verifications.queue();
    const pending = queue.filter(() => true);
    setQueue(pending);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const { txHash, blockNumber } = await api.verifications.approve(id);
      toast.success(`Credential recorded - Block #${blockNumber.toLocaleString()}`);
      const item = queue.find(q => q.id === id);
      if (item) setApproved(prev => [...prev, { ...item, txHash, blockNumber }]);
      setQueue(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      toast.error(err.message ?? "Approval failed.");
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!reason.trim() || reason.length < 10) { toast.error("Provide a reason (min 10 chars)."); return; }
    setRejecting(true);
    try {
      await api.verifications.reject(rejectId!, reason);
      toast("Document rejected - applicant notified.");
      setQueue(prev => prev.filter(q => q.id !== rejectId));
      setRejectId(null); setReason("");
    } catch (err: any) {
      toast.error(err.message ?? "Rejection failed.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <DashboardLayout
      title="Verifier Screen"
      subtitle="Verification Queue"
      nav={VERIFIER_NAV}
      backgroundImage="/dashboard-backgrounds/verifier.jpg"
    >
      <Card className="wire-panel mb-6 overflow-hidden p-0">
        <h2 className="wire-title text-center">Verification Queue</h2>
        <div className="flex items-center justify-center p-6">
          <span className={`rounded border border-dashed px-8 py-4 text-sm font-bold ${queue.length > 0 ? "border-orange-300 bg-orange-50 text-orange-700" : "border-green-300 bg-green-50 text-green-700"}`}>
            {queue.length} Pending Request{queue.length === 1 ? "" : "s"}
          </span>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      ) : queue.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--fg-muted)]">
          <AppIcon name="Done" size={48} className="text-[var(--primary)]" />
          <p className="text-xl font-semibold text-[var(--fg)]">Queue Cleared!</p>
          <p className="text-sm">All documents have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map(item => (
            <Card key={item.id} className="p-6">
              <div className="flex gap-4">
                <Avatar name={item.applicant_name} size={48} className="bg-purple-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-sora text-base font-bold text-[var(--fg)]">{item.applicant_name}</span>
                      <p className="text-sm text-[var(--fg-muted)] mt-0.5">{item.institution_name}</p>
                    </div>
                    <span className="text-xs text-[var(--fg-muted)] shrink-0">
                      Submitted {new Date(item.submitted_at).toLocaleDateString("en-ZW")}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <DocTypePill type={item.doc_type} />
                    <span className="text-sm font-medium text-[var(--fg)]">{item.title}</span>
                  </div>

                  <div className="mt-3 rounded-xl bg-[var(--muted)] p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--fg)]">Document SHA-256</span>
                      <a
                          href={`${API_BASE}/api/documents/${item.appwrite_file_id}/stream`}
                        target="_blank"
                        className="text-xs text-[var(--primary)] font-semibold hover:underline"
                      >
                        View Document
                      </a>
                    </div>
                    <p className="font-mono text-xs text-[var(--fg-muted)] break-all">{item.sha256_hash}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                    <button
                      onClick={() => approve(item.id)}
                      disabled={acting === item.id}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:brightness-90 disabled:opacity-60"
                    >
                      {acting === item.id ? <Spinner size={15} /> : "Approve"} Approve & Record
                    </button>
                    <button
                      onClick={() => { setRejectId(item.id); setReason(""); }}
                      className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <div className="mt-8">
          <h3 className="font-sora text-base font-bold text-[var(--fg)] mb-4">Recorded This Session</h3>
          <div className="space-y-3">
            {approved.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-5 py-3 dark:border-green-900 dark:bg-green-950/30">
                <div>
                  <span className="inline-flex items-center gap-1 font-semibold text-sm text-green-700 dark:text-green-400"><AppIcon name="Done" size={14} /> {item.applicant_name}</span>
                  <span className="text-sm text-green-800 dark:text-green-300 ml-2">{item.title}</span>
                  <div className="font-mono text-xs text-green-700 dark:text-green-400 mt-0.5">
                    Tx: {item.txHash} | Block #{item.blockNumber.toLocaleString()}
                  </div>
                </div>
                <VerifiedBadge />
              </div>
            ))}
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-8">
            <h3 className="font-sora text-lg font-bold text-[var(--fg)] mb-2">Reject Document</h3>
            <p className="text-sm text-[var(--fg-muted)] mb-4">
              Provide a clear reason so the applicant knows how to resubmit.
            </p>
            <label className="label">Rejection Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
              placeholder="e.g. The certificate is not clearly readable. Please resubmit a high-resolution scan."
              className="input resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={reject} disabled={rejecting} className="flex-1 justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:brightness-90 disabled:opacity-60 flex items-center gap-2">
                {rejecting ? <Spinner size={15} /> : null} Reject & Notify
              </button>
              <button onClick={() => setRejectId(null)} className="btn-ghost">Cancel</button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

