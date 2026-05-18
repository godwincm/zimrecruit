import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth } from "../../middleware/jwt.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const notificationsRouter = Router();

// ── GET /api/notifications — list user's unread notifications ─────────────────
notificationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT * FROM notifications
       WHERE recipient_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.sub]
    );
    res.json({ notifications: rows });
  })
);

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
notificationsRouter.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await db.execute(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?",
      [req.params.id, req.user!.sub]
    );
    res.json({ ok: true });
  })
);

// ── PATCH /api/notifications/read-all ────────────────────────────────────────
notificationsRouter.patch(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await db.execute(
      "UPDATE notifications SET is_read = 1 WHERE recipient_id = ?",
      [req.user!.sub]
    );
    res.json({ ok: true });
  })
);

/**
 * Helper used internally by other modules to create a notification.
 * Never exposed as a public route.
 */
export async function createNotification(
  recipientId: string,
  type: string,
  title: string,
  body: string,
  link?: string
): Promise<void> {
  await db.execute(
    `INSERT INTO notifications (id, recipient_id, type, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [uuidv4(), recipientId, type, title, body, link ?? null]
  );
}
