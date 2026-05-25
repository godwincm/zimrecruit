import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { deleteFile, downloadFile, getFileMetadata, STORAGE_BUCKET } from "../../lib/supabase.js";
import { sha256Hex } from "../../lib/hash.js";
import * as audit from "../audit/audit.service.js";

export const documentsRouter = Router();

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg"]);

const RegisterDocSchema = z.object({
  storagePath: z.string().min(1).max(500),
  docType:        z.enum(["education", "police_clearance", "medical", "id", "other"]),
  title:          z.string().min(3).max(200),
});

const VerifyRequestSchema = z.object({
  institutionId: z.string().uuid(),
});

// ── GET /api/documents — list applicant's own docs ───────────────────────────
documentsRouter.get(
  "/",
  requireAuth, requireRole("applicant"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT d.*,
              vr.status AS verification_status, vr.id AS verification_request_id,
              vr.reason AS verification_reason, vr.created_at AS verification_requested_at,
              vr.decided_at AS verification_decided_at,
              i.name AS institution_name, i.category AS institution_category,
              ma.receipt_hash, ma.sequence_number, ma.attested_at
       FROM documents d
       LEFT JOIN verification_requests vr ON vr.id = (
         SELECT vr2.id
         FROM verification_requests vr2
         WHERE vr2.document_id = d.id
         ORDER BY vr2.created_at DESC
         LIMIT 1
       )
       LEFT JOIN institutions i ON i.id = vr.institution_id
       LEFT JOIN mockchain_attestations ma ON ma.request_id = vr.id
       WHERE d.applicant_id = ?
       ORDER BY d.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ documents: rows });
  })
);

// ── POST /api/documents — register an uploaded doc and compute its hash ──────
documentsRouter.post(
  "/",
  requireAuth, requireRole("applicant"),
  validate(RegisterDocSchema),
  asyncHandler(async (req, res) => {
    const { storagePath, docType, title } = req.body;
    const applicantId = req.user!.sub;
    if (!storagePath.startsWith(`${req.user!.supabaseUserId}/`)) {
      return res.status(403).json({ error: "Uploaded file does not belong to your Supabase account." });
    }

    let fileBuffer: Buffer;
    let fileMeta: { mimeType: string; sizeOriginal: number };
    try {
      [fileBuffer, fileMeta] = await Promise.all([
        downloadFile(storagePath),
        getFileMetadata(storagePath),
      ]);
    } catch {
      return res.status(400).json({ error: "Could not fetch uploaded file. Verify the file id and try again." });
    }

    // Validate MIME type server-side
    if (!ALLOWED_MIME.has(fileMeta.mimeType)) {
      return res.status(422).json({ error: `MIME type "${fileMeta.mimeType}" is not allowed. Use PDF, PNG, or JPEG.` });
    }

    const hash = sha256Hex(fileBuffer);
    const docId = uuidv4();

    await db.execute(
      `INSERT INTO documents (id, applicant_id, doc_type, title, storage_path, storage_bucket, sha256_hash, size_bytes, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [docId, applicantId, docType, title, storagePath, STORAGE_BUCKET, hash, fileMeta.sizeOriginal, fileMeta.mimeType]
    );

    await audit.log(req, "DOC_UPLOAD", "documents", docId, { docType, hash });
    res.status(201).json({ ok: true, documentId: docId, sha256Hash: hash });
  })
);

// ── POST /api/documents/:id/verify — send doc to an institution ───────────────
documentsRouter.post(
  "/:id/verify",
  requireAuth, requireRole("applicant"),
  validate(VerifyRequestSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { institutionId } = req.body;

    // Ownership check
    const [docRows] = await db.query(
      "SELECT id, applicant_id, sha256_hash FROM documents WHERE id = ? LIMIT 1",
      [id]
    );
    const doc = (docRows as any[])[0];
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (doc.applicant_id !== req.user!.sub) return res.status(403).json({ error: "Access denied." });

    const [instRows] = await db.query(
      "SELECT id, name FROM institutions WHERE id = ? AND is_active = true LIMIT 1",
      [institutionId]
    );
    const institution = (instRows as Array<{ id: string; name: string }>)[0];
    if (!institution) {
      return res.status(422).json({ error: "Select an active verifier institution." });
    }

    const [alreadyVerified] = await db.query(
      "SELECT id FROM mockchain_attestations WHERE document_hash = ? AND revoked = false LIMIT 1",
      [doc.sha256_hash]
    );
    if ((alreadyVerified as any[]).length) {
      return res.status(409).json({ error: "This document has already been verified." });
    }

    // Prevent duplicate pending requests
    const [existing] = await db.query(
      "SELECT id FROM verification_requests WHERE document_id = ? AND status = 'pending' LIMIT 1",
      [id]
    );
    if ((existing as any[]).length) {
      return res.status(409).json({ error: "A pending verification request already exists for this document." });
    }

    const vrId = uuidv4();
    await db.execute(
      "INSERT INTO verification_requests (id, document_id, institution_id) VALUES (?, ?, ?)",
      [vrId, id, institutionId]
    );

    await audit.log(req, "VERIFY_REQUEST", "verification_requests", vrId, { documentId: id, institutionId });
    res.status(201).json({ ok: true, verificationRequestId: vrId, institutionName: institution.name });
  })
);

// ── GET /api/documents/:id/stream — serve file via signed URL ─────────────────
documentsRouter.delete(
  "/:id",
  requireAuth, requireRole("applicant", "admin"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      "SELECT applicant_id, storage_path FROM documents WHERE id = ? LIMIT 1",
      [req.params.id]
    );
    const doc = (rows as any[])[0];
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (!req.user!.roles.includes("admin") && doc.applicant_id !== req.user!.sub) {
      return res.status(403).json({ error: "Access denied." });
    }

    const [attestations] = await db.query(
      `SELECT ma.id
       FROM mockchain_attestations ma
       JOIN verification_requests vr ON vr.id = ma.request_id
       WHERE vr.document_id = ?
       LIMIT 1`,
      [req.params.id]
    );
    if ((attestations as Array<{ id: string }>).length) {
      return res.status(409).json({ error: "A document with a mockchain receipt cannot be deleted." });
    }

    await db.execute("DELETE FROM documents WHERE id = ?", [req.params.id]);
    await deleteFile(doc.storage_path).catch(() => undefined);
    await audit.log(req, "DOC_DELETE", "documents", req.params.id, {});
    res.json({ ok: true });
  })
);

documentsRouter.get(
  "/:id/stream",
  requireAuth, requireRole("applicant", "verifier", "admin"),
  asyncHandler(async (req, res) => {
    const { id: documentId } = req.params;
    const { bucket } = req.query as { bucket?: string };
    if (bucket && bucket !== STORAGE_BUCKET) {
      return res.status(400).json({ error: "Only the configured Supabase media bucket is supported." });
    }

    const [docMetaRows] = await db.query(
      "SELECT applicant_id, title, mime_type, storage_path FROM documents WHERE id = ? LIMIT 1",
      [documentId]
    );
    const docMeta = (docMetaRows as Array<{ applicant_id: string; title: string; mime_type: string | null; storage_path: string }>)[0];
    if (!docMeta) return res.status(404).json({ error: "Document not found." });

    if (req.user!.roles.includes("applicant") && docMeta?.applicant_id !== req.user!.sub) {
      return res.status(403).json({ error: "Access denied." });
    }

    // For verifiers: confirm they have a verification request for this document.
    if (!req.user!.roles.includes("admin") && !req.user!.roles.includes("applicant")) {
      const [rows] = await db.query(
        `SELECT im.user_id FROM institution_members im
         JOIN institutions i ON i.id = im.institution_id
         JOIN verification_requests vr ON vr.institution_id = i.id
         JOIN documents d ON d.id = vr.document_id
         WHERE im.user_id = ? AND d.id = ? LIMIT 1`,
        [req.user!.sub, documentId]
      );
      if (!(rows as any[]).length) {
        return res.status(403).json({ error: "Access denied." });
      }
    }

    const buffer = await downloadFile(docMeta.storage_path);
    const safeTitle = docMeta.title.replace(/["\r\n]/g, "");
    res.setHeader("Content-Disposition", `inline; filename="${safeTitle}"`);
    res.setHeader("Content-Type", docMeta?.mime_type ?? "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(buffer);
  })
);
