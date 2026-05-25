import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { notifyUser } from "../../lib/mailer.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as audit from "../audit/audit.service.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

const WarningSchema = z.object({
  reason: z.string().min(5).max(1000),
  details: z.string().max(2000).optional(),
});

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { role, status, limit = "100", offset = "0" } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const where: string[] = [];

    if (role) {
      where.push("ur.role = ?");
      params.push(role);
    }

    if (status === "active") where.push("u.is_active = true");
    if (status === "inactive") where.push("u.is_active = false");

    const [rows] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.avatar_file_id, u.is_active, u.created_at,
              string_agg(DISTINCT ur.role::text, ',' ORDER BY ur.role::text) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      users: (rows as any[]).map((user) => ({
        ...user,
        roles: user.roles ? String(user.roles).split(",") : [],
      })),
    });
  })
);

adminRouter.get(
  "/companies",
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query(
      `SELECT ep.user_id AS id, ep.company_name AS name, ep.industry, ep.location,
              ep.contact_email, ep.verified, u.is_active,
              COUNT(j.id) AS jobs
       FROM employer_profiles ep
       JOIN users u ON u.id = ep.user_id
       LEFT JOIN jobs j ON j.employer_id = ep.user_id
       GROUP BY ep.user_id, ep.company_name, ep.industry, ep.location, ep.contact_email, ep.verified, u.is_active
       ORDER BY ep.company_name ASC`
    );

    res.json({ companies: rows });
  })
);

adminRouter.post(
  "/users/:id/warnings",
  validate(WarningSchema),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = ? AND ur.role = 'applicant'
       LIMIT 1`,
      [req.params.id]
    );
    const applicant = (rows as { id: string; email: string }[])[0];
    if (!applicant) return res.status(404).json({ error: "Applicant not found." });

    await notifyUser("admin_warning", applicant.id, {
      reason: req.body.reason,
      details: req.body.details,
    });

    await audit.log(req, "ADMIN_WARNING", "users", applicant.id, {
      reason: req.body.reason,
      details: req.body.details ?? null,
    });

    res.status(201).json({ ok: true });
  })
);
