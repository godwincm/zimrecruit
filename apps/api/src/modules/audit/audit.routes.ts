import { Router } from "express";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const auditRouter = Router();

auditRouter.get(
  "/",
  requireAuth, requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { limit = "50", offset = "0", actor, action, entity } = req.query as Record<string, string>;

    let sql = "SELECT * FROM audit_logs WHERE 1=1";
    const params: unknown[] = [];

    if (actor)  { sql += " AND actor_id = ?";  params.push(actor); }
    if (action) { sql += " AND action = ?";    params.push(action); }
    if (entity) { sql += " AND entity = ?";    params.push(entity); }

    sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);
    res.json({ logs: rows });
  })
);
