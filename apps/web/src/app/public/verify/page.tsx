"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AppIcon, Spinner, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

const SAMPLE_HASH = "0xab34cd56ef789012ab34cd56ef789012ab34cd56ef789012ab34cd56ef789012";

export default function VerifyPage() {
  const [hash, setHash]   = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!hash.trim()) { toast.error("Enter a document hash."); return; }
    setLoading(true);
    setResult(null);
    try {
      const data = await api.public.verify(hash.trim());
      setResult(data);
    } catch {
      toast.error("Lookup failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center text-[var(--primary)]"><AppIcon name="chain" size={44} /></div>
          <h1 className="font-sora text-4xl font-extrabold text-[var(--fg)]">Verify a Credential</h1>
          <p className="mt-3 text-[var(--fg-muted)]">
            Check the trusted verification status of any document hash.
          </p>
        </div>

        {/* Input card */}
        <div className="card p-8 mb-6">
          <label className="label">Document SHA-256 Hash</label>
          <div className="flex gap-3">
            <input
              value={hash}
              onChange={e => { setHash(e.target.value); setResult(null); }}
              onKeyDown={e => e.key === "Enter" && check()}
              placeholder="0x..."
              className="input flex-1 font-mono text-sm"
            />
            <button onClick={check} disabled={loading} className="btn-primary shrink-0 px-6">
              {loading ? <Spinner size={17} /> : "Verify"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--fg-muted)]">
            Sample hash:{" "}
            <button
              onClick={() => { setHash(SAMPLE_HASH); setResult(null); }}
              className="font-mono text-[var(--primary)] hover:underline"
            >
              {SAMPLE_HASH.slice(0, 24)}...
            </button>
          </p>
        </div>

        {/* Result */}
        {result?.found && (
          <div className="rounded-2xl border border-green-300 bg-green-50 p-8 dark:border-green-900 dark:bg-green-950/30">
            <div className="mb-6 flex items-center gap-4">
                <AppIcon name="done" size={36} className="text-green-700 dark:text-green-400" />
              <div>
                <h2 className="font-sora text-2xl font-extrabold text-green-700 dark:text-green-400">
                  Document Verified
                </h2>
                <p className="text-sm text-green-800 dark:text-green-300">
                  Attestation confirmed in the local verification record.
                </p>
              </div>
              <div className="ml-auto"><VerifiedBadge size="md" /></div>
            </div>

            <div className="space-y-2">
              {[
                ["Document", result.attestation.institution_name ? "On record with " + result.attestation.institution_name : "-"],
                ["Attested by",      result.attestation.institution_name],
                ["Category",         result.attestation.category.replace("_", " ")],
                ["Attestation Date", new Date(result.attestation.attested_at).toLocaleString("en-ZW")],
                ["Block Number",     "#" + Number(result.attestation.block_number).toLocaleString()],
                ["Transaction Hash", result.attestation.tx_hash],
                ["Verifier Wallet",  result.attestation.verifier_wallet],
                ["Status", result.attestation.revoked ? "REVOKED" : "VALID - Not Revoked"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4 rounded-xl bg-white/70 px-4 py-3 dark:bg-black/20">
                  <span className="shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">{l}</span>
                  <span className={`break-all text-right text-sm ${["Transaction Hash","Verifier Wallet"].includes(l!) ? "font-mono text-xs" : ""} text-green-800 dark:text-green-300`}>
                    {v}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

        {result && !result.found && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
            <div className="mb-3 flex justify-center text-red-700 dark:text-red-400"><AppIcon name="close" size={44} /></div>
            <h2 className="font-sora text-2xl font-extrabold text-red-700 dark:text-red-400">Not Found</h2>
            <p className="mt-2 text-sm text-red-800 dark:text-red-300">
              No attestation exists for this hash. The document may not have been verified, or the hash may be incorrect.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

