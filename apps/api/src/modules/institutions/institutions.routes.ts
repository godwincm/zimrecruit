import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as audit from "../audit/audit.service.js";

export const institutionsRouter = Router();

const CreateInstSchema = z.object({
  name:          z.string().min(3).max(200),
  category:      z.enum(["zrp", "medical", "education"]),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum wallet address"),
  contactEmail:  z.string().email(),
});

const AddMemberSchema = z.object({
  userId:        z.string().uuid(),
  institutionId: z.string().uuid(),
});

// ── GET /api/institutions — public list ───────────────────────────────────────
institutionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query(
      "SELECT id, name, category, contact_email, is_active FROM institutions ORDER BY name"
    );
    res.json({ institutions: rows });
  })
);

// ── POST /api/institutions — admin onboards an institution ───────────────────
institutionsRouter.post(
  "/",
  requireAuth, requireRole("admin"),
  validate(CreateInstSchema),
  asyncHandler(async (req, res) => {
    const { name, category, walletAddress, contactEmail } = req.body;
    const id = uuidv4();

    await db.execute(
      "INSERT INTO institutions (id, name, category, wallet_address, contact_email) VALUES (?, ?, ?, ?, ?)",
      [id, name, category, walletAddress.toLowerCase(), contactEmail]
    );

    await audit.log(req, "INSTITUTION_ONBOARD", "institutions", id, { name, category, walletAddress });
    res.status(201).json({ ok: true, institutionId: id });
  })
);

// ── PATCH /api/institutions/:id/suspend ───────────────────────────────────────
institutionsRouter.patch(
  "/:id/suspend",
  requireAuth, requireRole("admin"),
  asyncHandler(async (req, res) => {
    await db.execute(
      "UPDATE institutions SET is_active = NOT is_active WHERE id = ?",
      [req.params.id]
    );
    await audit.log(req, "INSTITUTION_SUSPEND", "institutions", req.params.id, {});
    res.json({ ok: true });
  })
);

// ── POST /api/institutions/members — admin adds verifier to institution ───────
institutionsRouter.delete(
  "/:id",
  requireAuth, requireRole("admin"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT id FROM institutions WHERE id = ? LIMIT 1", [req.params.id]);
    if (!(rows as any[]).length) return res.status(404).json({ error: "Institution not found." });

    await db.execute("DELETE FROM institutions WHERE id = ?", [req.params.id]);
    await audit.log(req, "INSTITUTION_DELETE", "institutions", req.params.id, {});
    res.json({ ok: true });
  })
);

institutionsRouter.post(
  "/members",
  requireAuth, requireRole("admin"),
  validate(AddMemberSchema),
  asyncHandler(async (req, res) => {
    const { userId, institutionId } = req.body;

    // Ensure user has verifier role
    await db.execute(
      "INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'verifier')",
      [userId]
    );
    await db.execute(
      "INSERT IGNORE INTO institution_members (user_id, institution_id) VALUES (?, ?)",
      [userId, institutionId]
    );

    res.status(201).json({ ok: true });
  })
);
