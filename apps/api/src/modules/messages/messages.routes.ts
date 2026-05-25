import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { createNotification } from "../notifications/notifications.routes.js";

export const messagesRouter = Router();

const CreateConversationSchema = z.object({
  participantId: z.string().uuid(),
  subject: z.string().trim().max(150).optional(),
});

const SendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

async function assertParticipant(conversationId: string, userId: string): Promise<void> {
  const [rows] = await db.query(
    "SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1",
    [conversationId, userId]
  );
  if (!(rows as unknown[]).length) {
    throw Object.assign(new Error("Conversation not found."), { status: 404 });
  }
}

messagesRouter.get(
  "/contacts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, string_agg(ur.role::text, ',' ORDER BY ur.role::text) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id <> ? AND u.is_active = true
       GROUP BY u.id
       ORDER BY u.full_name ASC
       LIMIT 100`,
      [req.user!.sub]
    );
    res.json({ contacts: rows });
  })
);

messagesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT c.id, c.subject, c.created_at,
              other.id AS participant_id, other.full_name AS participant_name,
              latest.body AS last_message, latest.created_at AS last_message_at
       FROM conversations c
       JOIN conversation_participants mine ON mine.conversation_id = c.id AND mine.user_id = ?
       JOIN conversation_participants theirs ON theirs.conversation_id = c.id AND theirs.user_id <> ?
       JOIN users other ON other.id = theirs.user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
       ) latest ON true
       ORDER BY COALESCE(latest.created_at, c.created_at) DESC`,
      [req.user!.sub, req.user!.sub]
    );
    res.json({ conversations: rows });
  })
);

messagesRouter.post(
  "/",
  requireAuth,
  validate(CreateConversationSchema),
  asyncHandler(async (req, res) => {
    const { participantId, subject } = req.body;
    if (participantId === req.user!.sub) {
      return res.status(422).json({ error: "Choose another user to start a conversation." });
    }

    const [contactRows] = await db.query(
      "SELECT id FROM users WHERE id = ? AND is_active = true LIMIT 1",
      [participantId]
    );
    if (!(contactRows as unknown[]).length) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    const [existingRows] = await db.query(
      `SELECT cp1.conversation_id AS id
       FROM conversation_participants cp1
       JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
       WHERE cp1.user_id = ? AND cp2.user_id = ?
       LIMIT 1`,
      [req.user!.sub, participantId]
    );
    const existing = (existingRows as Array<{ id: string }>)[0];
    if (existing) return res.json({ conversationId: existing.id });

    const conversationId = uuidv4();
    await db.transaction(async (conn) => {
      await conn.execute(
        "INSERT INTO conversations (id, subject, created_by) VALUES (?, ?, ?)",
        [conversationId, subject || null, req.user!.sub]
      );
      await conn.execute(
        "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)",
        [conversationId, req.user!.sub, conversationId, participantId]
      );
    });
    res.status(201).json({ conversationId });
  })
);

messagesRouter.get(
  "/:id/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.id, req.user!.sub);
    const [rows] = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC
       LIMIT 200`,
      [req.params.id]
    );
    res.json({ messages: rows });
  })
);

messagesRouter.post(
  "/:id/messages",
  requireAuth,
  validate(SendMessageSchema),
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.id, req.user!.sub);
    const messageId = uuidv4();
    await db.execute(
      "INSERT INTO messages (id, conversation_id, sender_id, body) VALUES (?, ?, ?, ?)",
      [messageId, req.params.id, req.user!.sub, req.body.body]
    );

    const [recipients] = await db.query(
      "SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id <> ?",
      [req.params.id, req.user!.sub]
    );
    await Promise.all((recipients as Array<{ user_id: string }>).map(recipient =>
      createNotification(recipient.user_id, "new_message", "New message", req.body.body.slice(0, 120), "/messages")
    ));
    res.status(201).json({ id: messageId });
  })
);
