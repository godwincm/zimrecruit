import "./lib/env.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";
import { verificationsRouter } from "./modules/verifications/verifications.routes.js";
import { institutionsRouter } from "./modules/institutions/institutions.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { db } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://cloud.appwrite.io"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.APP_BASE_URL ?? "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — try again in a minute." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  message: { error: "Too many login attempts — try again in 15 minutes." },
});

app.use(globalLimiter);
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/me", usersRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/verifications", verificationsRouter);
app.use("/api/institutions", institutionsRouter);
app.use("/api/admin/audit", auditRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationsRouter);

// ── Public verify route ─────────────────────────────────────────────────────
app.get("/api/public/verify/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const [rows] = await db.query(
      `SELECT oca.*, i.name AS institution_name, i.category
       FROM on_chain_attestations oca
       JOIN verification_requests vr ON vr.id = oca.request_id
       JOIN institutions i ON i.id = oca.institution_id
       WHERE oca.document_hash = ?
       LIMIT 1`,
      [hash]
    );
    const record = (rows as any[])[0] ?? null;
    res.json({ found: Boolean(record), attestation: record });
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Job expiry cron (every 10 min) ─────────────────────────────────────────
cron.schedule("*/10 * * * *", async () => {
  try {
    await db.query(
      "UPDATE jobs SET status='expired' WHERE status='open' AND deadline < NOW()"
    );
  } catch (err) {
    console.error("[cron] job-expiry error:", err);
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 ZimRecruit API running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV ?? "development"}`);
});

export { app };
