import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { notifyUser } from "../../lib/mailer.js";
import * as audit from "../audit/audit.service.js";

export const verificationsRouter = Router();

const RejectSchema = z.object({ reason: z.string().min(10).max(1000) });

function conflict(message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status: 409 });
}

// ── GET /api/verifications/queue — verifier sees pending docs ─────────────────
verificationsRouter.get(
  "/queue",
  requireAuth, requireRole("verifier"),
  asyncHandler(async (req, res) => {
    // Find the institution this verifier belongs to
    const [instRows] = await db.query(
      "SELECT institution_id FROM institution_members WHERE user_id = ? LIMIT 1",
      [req.user!.sub]
    );
    const instId = (instRows as { institution_id: string }[])[0]?.institution_id;
    if (!instId) return res.status(403).json({ error: "You are not a member of any institution." });

    const [rows] = await db.query(
      `SELECT vr.id, vr.created_at AS submitted_at,
              i.name AS institution_name, i.category AS institution_category,
              d.id AS document_id, d.storage_path, d.title, d.title AS doc_title, d.doc_type, d.sha256_hash, d.mime_type,
              u.id AS applicant_id, u.full_name AS applicant_name, u.email AS applicant_email,
              ap.headline AS applicant_headline
       FROM verification_requests vr
       JOIN documents d ON d.id = vr.document_id
       JOIN users u ON u.id = d.applicant_id
       JOIN institutions i ON i.id = vr.institution_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE vr.institution_id = ? AND vr.status = 'pending'
       ORDER BY vr.created_at ASC`,
      [instId]
    );

    res.json({ queue: rows, institutionId: instId });
  })
);

// ── GET /api/verifications/processed — verifier sees completed docs ───────────
verificationsRouter.get(
  "/processed",
  requireAuth, requireRole("verifier"),
  asyncHandler(async (req, res) => {
    const [instRows] = await db.query(
      "SELECT institution_id FROM institution_members WHERE user_id = ? LIMIT 1",
      [req.user!.sub]
    );
    const instId = (instRows as { institution_id: string }[])[0]?.institution_id;
    if (!instId) return res.status(403).json({ error: "You are not a member of any institution." });

    const [rows] = await db.query(
      `SELECT vr.id, vr.status, vr.reason, vr.created_at AS submitted_at, vr.decided_at,
              i.name AS institution_name, i.category AS institution_category,
              d.id AS document_id, d.storage_path, d.title, d.title AS doc_title,
              d.doc_type, d.sha256_hash, d.mime_type,
              u.id AS applicant_id, u.full_name AS applicant_name, u.email AS applicant_email,
              reviewer.full_name AS reviewer_name,
              ma.receipt_hash, ma.sequence_number, ma.attested_at, verifier.full_name AS verifier_name
       FROM verification_requests vr
       JOIN documents d ON d.id = vr.document_id
       JOIN users u ON u.id = d.applicant_id
       JOIN institutions i ON i.id = vr.institution_id
       LEFT JOIN users reviewer ON reviewer.id = vr.reviewer_id
       LEFT JOIN mockchain_attestations ma ON ma.request_id = vr.id
       LEFT JOIN users verifier ON verifier.id = ma.verifier_id
       WHERE vr.institution_id = ? AND vr.status IN ('approved', 'rejected')
       ORDER BY COALESCE(vr.decided_at, vr.created_at) DESC`,
      [instId]
    );

    res.json({ requests: rows, institutionId: instId });
  })
);

// POST /api/verifications/:id/approve - append a Supabase mockchain receipt.
verificationsRouter.post(
  "/:id/approve",
  requireAuth, requireRole("verifier"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Load request + document + institution
    const [vrRows] = await db.query(
      `SELECT vr.*, d.sha256_hash, d.title AS doc_title, d.applicant_id,
              i.id AS inst_id, i.name AS inst_name
       FROM verification_requests vr
       JOIN documents d ON d.id = vr.document_id
       JOIN institutions i ON i.id = vr.institution_id
       WHERE vr.id = ? LIMIT 1`,
      [id]
    );
    const vr = (vrRows as any[])[0];
    if (!vr) return res.status(404).json({ error: "Verification request not found." });
    if (vr.status !== "pending") return res.status(409).json({ error: `Request is already ${vr.status}.` });

    // Confirm verifier belongs to this institution
    const [memRows] = await db.query(
      "SELECT 1 FROM institution_members WHERE user_id = ? AND institution_id = ? LIMIT 1",
      [req.user!.sub, vr.inst_id]
    );
    if (!(memRows as any[]).length) {
      return res.status(403).json({ error: "You are not a member of this institution." });
    }

    // One active mockchain receipt is permitted for each document hash.
    const [existingAtt] = await db.query(
      "SELECT id FROM mockchain_attestations WHERE document_hash = ? AND revoked = false LIMIT 1",
      [vr.sha256_hash]
    );
    if ((existingAtt as any[]).length) {
      return res.status(409).json({ error: "This document hash already has a mockchain receipt." });
    }

    let receiptHash = "";
    let sequenceNumber = 0;
    try {
      await db.transaction(async (conn) => {
        const [updated] = await conn.query(
          `UPDATE verification_requests
           SET status='approved', reviewer_id=?, decided_at=NOW()
           WHERE id=? AND status='pending'
           RETURNING id`,
          [req.user!.sub, id]
        );
        if (!(updated as Array<{ id: string }>).length) {
          throw conflict("This verification request has already been processed.");
        }

        const [ledgerRows] = await conn.query(
          `SELECT receipt_hash, sequence_number
           FROM append_mockchain_attestation(?, ?, ?, ?, ?)`,
          [id, vr.sha256_hash, vr.inst_id, vr.inst_name, req.user!.sub]
        );
        const entry = (ledgerRows as Array<{ receipt_hash: string; sequence_number: number }>)[0];
        receiptHash = entry.receipt_hash;
        sequenceNumber = Number(entry.sequence_number);
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "23505") {
        return res.status(409).json({ error: "This document hash already has an active mockchain receipt." });
      }
      if ((err as { code?: string })?.code === "23514") {
        return res.status(409).json({ error: "The request no longer matches an eligible verifier assignment." });
      }
      throw err;
    }

    await audit.log(req, "VERIFY_APPROVE", "verification_requests", id, { receiptHash, sequenceNumber, ledger: "supabase" });

    // Email the applicant
    await notifyUser("verification_approved", vr.applicant_id, {
      receiptHash,
      docTitle: vr.doc_title,
    }).catch(err => console.warn("[mailer] verification_approved:", err.message));

    res.json({ ok: true, receiptHash, sequenceNumber });
  })
);

// ── POST /api/verifications/:id/reject ───────────────────────────────────────
verificationsRouter.post(
  "/:id/reject",
  requireAuth, requireRole("verifier"),
  validate(RejectSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const [vrRows] = await db.query(
      `SELECT vr.*, d.title AS doc_title, d.applicant_id, i.id AS inst_id
       FROM verification_requests vr
       JOIN documents d ON d.id = vr.document_id
       JOIN institutions i ON i.id = vr.institution_id
       WHERE vr.id = ? LIMIT 1`,
      [id]
    );
    const vr = (vrRows as any[])[0];
    if (!vr) return res.status(404).json({ error: "Not found." });
    if (vr.status !== "pending") return res.status(409).json({ error: `Request already ${vr.status}.` });

    const [memRows] = await db.query(
      "SELECT 1 FROM institution_members WHERE user_id = ? AND institution_id = ? LIMIT 1",
      [req.user!.sub, vr.inst_id]
    );
    if (!(memRows as any[]).length) {
      return res.status(403).json({ error: "You are not a member of this institution." });
    }

    await db.execute(
      "UPDATE verification_requests SET status='rejected', reviewer_id=?, reason=?, decided_at=NOW() WHERE id=?",
      [req.user!.sub, reason, id]
    );

    await audit.log(req, "VERIFY_REJECT", "verification_requests", id, { reason });

    await notifyUser("verification_rejected", vr.applicant_id, {
      docTitle: vr.doc_title,
      reason,
    }).catch(err => console.warn("[mailer] verification_rejected:", err.message));

    res.json({ ok: true });
  })
);
