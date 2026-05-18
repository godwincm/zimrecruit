"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AppIcon, Card, DocTypePill, Spinner, StatusPill, VerifiedBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { uploadDocument } from "@/lib/appwrite";
import toast from "react-hot-toast";

const NAV = [
  { href: "/applicant", label: "Dashboard", icon: "Overview" },
  { href: "/applicant/documents", label: "My Documents", icon: "Documents" },
  { href: "/applicant/applications", label: "Job Apps", icon: "Applications" },
  { href: "/jobs", label: "Jobs", icon: "Jobs" },
  { href: "/applicant/profile", label: "Profile", icon: "Profile" },
];

const DOC_TYPES = [
  { value: "education", label: "Academic Certificate" },
  { value: "police_clearance", label: "Police Clearance" },
  { value: "medical", label: "Medical Report" },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("education");
  const [issuingInstitution, setIssuingInstitution] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [targetInstitutionId, setTargetInstitutionId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ documents }, { institutions }] = await Promise.all([api.documents.list(), api.institutions.list()]);
    setDocs(documents);
    setInstitutions(institutions);
    setTargetInstitutionId(institutions.find((item: any) => item.is_active)?.id ?? "");
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startUpload = (type: string) => {
    setDocType(type);
    setIssuingInstitution("");
    setIssueDate("");
    setComments("");
    setFile(null);
    document.getElementById("upload-document-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleUploadAndSend = async () => {
    const selectedType = DOC_TYPES.find((item) => item.value === docType);
    if (!file) { toast.error("Choose a document file."); return; }
    if (!issuingInstitution.trim()) { toast.error("Enter the issuing institution."); return; }
    if (!targetInstitutionId) { toast.error("Select an institution for verification."); return; }

    setUploading(true);
    try {
      const appwriteFileId = await uploadDocument(file);
      const { documentId } = await api.documents.register({
        appwriteFileId,
        docType,
        title: selectedType?.label ?? "Verification Document",
        issuingInstitution,
        issueDate,
        comments,
      });
      await api.documents.requestVerify(documentId, targetInstitutionId);
      toast.success("Document uploaded and sent for verification.");
      setFile(null);
      setComments("");
      await load();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout title="Applicant Screen" subtitle="Main Workspace / Documents List" nav={NAV}>
      <div className="mx-auto max-w-5xl">
        <Card className="wire-panel overflow-hidden p-0">
          <h2 className="wire-title text-center">My Documents (Applicant)</h2>
          <div className="grid gap-6 p-6">
            {DOC_TYPES.map((item) => (
              <button key={item.value} type="button" onClick={() => startUpload(item.value)} className="wire-action">
                <AppIcon name={item.value === "education" ? "Education" : item.value === "medical" ? "Medical" : "Police"} size={24} />
                Upload {item.label}
              </button>
            ))}
            <a href="#verification-status" className="wire-action">
              <AppIcon name="Search" size={24} />
              View Verification Status
            </a>
          </div>
        </Card>

        <Card id="upload-document-form" className="wire-panel mt-6 overflow-hidden p-0">
          <h2 className="wire-title">Upload Verification Document</h2>
          <div className="grid gap-4 p-5 md:grid-cols-[0.42fr_0.58fr]">
            <label className="label">Document Type:</label>
            <select value={docType} onChange={(event) => setDocType(event.target.value)} className="wire-field">
              {DOC_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>

            <label className="label">Issuing Institution:</label>
            <input value={issuingInstitution} onChange={(event) => setIssuingInstitution(event.target.value)} className="wire-field" placeholder="Enter institution name" />

            <label className="label">Date of Issue:</label>
            <input value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="wire-field" placeholder="DD/MM/YYYY" />

            <label className="label">Document File:</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="wire-button shrink-0">
                Browse File
              </button>
              <span className="flex min-h-10 flex-1 items-center border-b border-neutral-900 text-sm text-[var(--fg-muted)] dark:border-[var(--border)]">
                {file ? file.name : "PDF, max 5 MB"}
              </span>
              <input ref={fileRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </div>

            <label className="label">Comments:</label>
            <input value={comments} onChange={(event) => setComments(event.target.value)} className="wire-field" placeholder="Additional notes (Optional)" />

            <label className="label">Send To Institution:</label>
            <select value={targetInstitutionId} onChange={(event) => setTargetInstitutionId(event.target.value)} className="wire-field">
              {institutions.filter((item) => item.is_active).map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.category})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-neutral-900 p-5 dark:border-[var(--border)]">
            <button type="button" onClick={handleUploadAndSend} disabled={uploading} className="wire-button">
              {uploading ? <><Spinner size={15} /> Sending</> : "Send for Verification"}
            </button>
          </div>
        </Card>

        <Card id="verification-status" className="wire-panel mt-6 overflow-hidden p-0">
          <h2 className="wire-title">Verification Status</h2>
          {loading ? (
            <div className="flex h-28 items-center justify-center"><Spinner /></div>
          ) : (
            <table className="wire-table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Title</th>
                  <th>Institution</th>
                  <th>Status</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td><DocTypePill type={doc.doc_type} /></td>
                    <td className="font-semibold">{doc.title}</td>
                    <td>{doc.institution_name ?? "Pending assignment"}</td>
                    <td><StatusPill status={doc.verification_status ?? "pending"} /></td>
                    <td>{doc.verification_status === "approved" ? <VerifiedBadge /> : <span className="text-[var(--fg-muted)]">Awaiting review</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
