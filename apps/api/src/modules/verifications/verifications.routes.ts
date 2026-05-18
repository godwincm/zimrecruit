import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { attest } from "../../chain/contract.js";
import { sendEmailToUser } from "../../lib/mailer.js";
import * as audit from "../audit/audit.service.js";

export const verificationsRouter = Router();

const RejectSchema = z.object({ reason: z.string().min(10).max(1000) });

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
              d.id AS document_id, d.appwrite_file_id, d.title AS doc_title, d.doc_type, d.sha256_hash, d.mime_type,
              u.id AS applicant_id, u.full_name AS applicant_name, u.email AS applicant_email,
              ap.headline AS applicant_headline
       FROM verification_requests vr
       JOIN documents d ON d.id = vr.document_id
       JOIN users u ON u.id = d.applicant_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE vr.institution_id = ? AND vr.status = 'pending'
       ORDER BY vr.created_at ASC`,
      [instId]
    );

    res.json({ queue: rows, institutionId: instId });
  })
);

// ── POST /api/verifications/:id/approve — attest on-chain ─────────────────────
verificationsRouter.post(
  "/:id/approve",
  requireAuth, requireRole("verifier"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Load request + document + institution
    const [vrRows] = await db.query(
      `SELECT vr.*, d.sha256_hash, d.title AS doc_title, d.applicant_id,
              i.id AS inst_id, i.name AS inst_name, i.wallet_address
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

    // Duplicate guard — check if hash is already on-chain in our DB
    const [existingAtt] = await db.query(
      "SELECT id FROM on_chain_attestations WHERE document_hash = ? LIMIT 1",
      [vr.sha256_hash]
    );
    if ((existingAtt as any[]).length) {
      return res.status(409).json({ error: "This document hash is already attested on-chain." });
    }

    // Submit blockchain attestation
    const { txHash, blockNumber } = await attest(
      vr.sha256_hash,
      // Use a stable numeric id from the institution's wallet (hash % 2^32)
      parseInt(vr.inst_id.replace(/-/g, "").slice(0, 8), 16),
      vr.inst_name
    );

    // Persist in a single transaction
    await db.transaction(async (conn) => {
      await conn.execute(
        `UPDATE verification_requests
         SET status='approved', reviewer_id=?, decided_at=NOW()
         WHERE id=?`,
        [req.user!.sub, id]
      );

      await conn.execute(
        `INSERT INTO on_chain_attestations
           (id, request_id, document_hash, institution_id, institution_name,
            verifier_wallet, tx_hash, block_number, chain_id)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, vr.sha256_hash, vr.inst_id, vr.inst_name,
         process.env.VERIFIER_WALLET_ADDRESS,
         txHash, blockNumber, Number(process.env.BLOCKCHAIN_CHAIN_ID ?? 31337)]
      );
    });

    await audit.log(req, "VERIFY_APPROVE", "verification_requests", id, { txHash, blockNumber });

    // Email the applicant
    await sendEmailToUser("verification_approved", vr.applicant_id, {
      txHash,
      docTitle: vr.doc_title,
    }).catch(err => console.warn("[mailer] verification_approved:", err.message));

    res.json({ ok: true, txHash, blockNumber });
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

    await db.execute(
      "UPDATE verification_requests SET status='rejected', reviewer_id=?, reason=?, decided_at=NOW() WHERE id=?",
      [req.user!.sub, reason, id]
    );

    await audit.log(req, "VERIFY_REJECT", "verification_requests", id, { reason });

    await sendEmailToUser("verification_rejected", vr.applicant_id, {
      docTitle: vr.doc_title,
      reason,
    }).catch(err => console.warn("[mailer] verification_rejected:", err.message));

    res.json({ ok: true });
  })
);
