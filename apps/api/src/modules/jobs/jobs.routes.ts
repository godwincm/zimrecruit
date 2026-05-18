import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as audit from "../audit/audit.service.js";

export const jobsRouter = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const CreateJobSchema = z.object({
  title:         z.string().min(3).max(200),
  industry:      z.string().min(2).max(120),
  qualification: z.string().max(120).optional(),
  skills:        z.array(z.string()).max(20).optional(),
  duties:        z.string().max(5000).optional(),
  description:   z.string().min(20).max(10_000),
  location:      z.string().max(120).optional(),
  deadline:      z.string().datetime({ offset: true }),
  verifiedRequired: z.boolean().optional(),
});

const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: z.enum(["open", "closed"]).optional(),
});

// ── GET /api/jobs — public listing with filters ──────────────────────────────
jobsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { industry, qualification, search, status = "open", limit = "20", offset = "0" } = req.query as Record<string, string>;

    let sql = `
      SELECT j.*, ep.company_name, ep.location AS company_location, ep.logo_file_id,
             COUNT(a.id) AS applicant_count
      FROM jobs j
      JOIN employer_profiles ep ON ep.user_id = j.employer_id
      LEFT JOIN applications a ON a.job_id = j.id
      WHERE j.status = ?`;
    const params: unknown[] = [status];

    if (industry) { sql += " AND j.industry = ?"; params.push(industry); }
    if (qualification) { sql += " AND j.qualification = ?"; params.push(qualification); }
    if (search) {
      sql += " AND MATCH(j.title, j.description) AGAINST(? IN BOOLEAN MODE)";
      params.push(search + "*");
    }

    sql += " GROUP BY j.id ORDER BY j.created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const [rows] = await db.query(sql, params);
    res.json({ jobs: rows });
  })
);

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
jobsRouter.get(
  "/candidates",
  requireAuth, requireRole("employer", "admin"),
  asyncHandler(async (req, res) => {
    const { search = "", verifiedOnly = "false", limit = "50", offset = "0" } = req.query as Record<string, string>;
    const params: unknown[] = [];
    const where: string[] = [];

    if (!req.user!.roles.includes("admin")) {
      where.push("j.employer_id = ?");
      params.push(req.user!.sub);
    }

    if (search.trim()) {
      where.push("(u.full_name LIKE ? OR ap.headline LIKE ? OR ap.location LIKE ? OR JSON_SEARCH(ap.skills, 'one', ?) IS NOT NULL)");
      const like = `%${search.trim()}%`;
      params.push(like, like, like, like);
    }

    if (verifiedOnly === "true") {
      where.push(`EXISTS (
        SELECT 1 FROM on_chain_attestations oca
        JOIN verification_requests vr ON vr.id = oca.request_id
        JOIN documents d ON d.id = vr.document_id
        WHERE d.applicant_id = u.id AND oca.revoked = 0
      )`);
    }

    const [rows] = await db.query(
      `SELECT a.id AS application_id, a.status, a.created_at,
              u.id AS user_id, u.full_name, u.email, u.avatar_file_id,
              ap.headline, ap.location, ap.skills,
              j.id AS job_id, j.title AS job_title,
              (SELECT COUNT(*) FROM on_chain_attestations oca
               JOIN verification_requests vr ON vr.id = oca.request_id
               JOIN documents d ON d.id = vr.document_id
               WHERE d.applicant_id = u.id AND oca.revoked = 0) AS verified_docs
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.applicant_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({ candidates: rows });
  })
);

jobsRouter.get("/:id", asyncHandler(async (req, res) => {
  const [rows] = await db.query(
    `SELECT j.*, ep.company_name, ep.location AS company_location, ep.logo_file_id, ep.website, ep.industry AS company_industry
     FROM jobs j JOIN employer_profiles ep ON ep.user_id = j.employer_id
     WHERE j.id = ? LIMIT 1`,
    [req.params.id]
  );
  const job = (rows as any[])[0];
  if (!job) return res.status(404).json({ error: "Job not found." });
  res.json({ job });
}));

// ── POST /api/jobs — employer creates a job ───────────────────────────────────
jobsRouter.post(
  "/",
  requireAuth, requireRole("employer", "admin"),
  validate(CreateJobSchema),
  asyncHandler(async (req, res) => {
    const id = uuidv4();
    const { title, industry, qualification, skills, duties, description, location, deadline } = req.body;

    await db.execute(
      `INSERT INTO jobs (id, employer_id, title, industry, qualification, skills, duties, description, location, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user!.sub, title, industry, qualification ?? null,
       JSON.stringify(skills ?? []), duties ?? null, description, location ?? null, new Date(deadline)]
    );

    await audit.log(req, "JOB_POST", "jobs", id, { title });
    res.status(201).json({ ok: true, jobId: id });
  })
);

// ── PATCH /api/jobs/:id ───────────────────────────────────────────────────────
jobsRouter.patch(
  "/:id",
  requireAuth, requireRole("employer", "admin"),
  validate(UpdateJobSchema),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT employer_id FROM jobs WHERE id = ? LIMIT 1", [req.params.id]);
    const job = (rows as any[])[0];
    if (!job) return res.status(404).json({ error: "Job not found." });

    const isAdmin = req.user!.roles.includes("admin");
    if (!isAdmin && job.employer_id !== req.user!.sub) {
      return res.status(403).json({ error: "You do not own this job." });
    }

    const { title, description, deadline, status, skills, industry, location, qualification, duties } = req.body;
    await db.execute(
      `UPDATE jobs SET
         title = COALESCE(?, title), description = COALESCE(?, description),
         deadline = COALESCE(?, deadline), status = COALESCE(?, status),
         skills = COALESCE(?, skills), industry = COALESCE(?, industry),
         location = COALESCE(?, location), qualification = COALESCE(?, qualification),
         duties = COALESCE(?, duties)
       WHERE id = ?`,
      [title, description, deadline ? new Date(deadline) : null, status,
       skills ? JSON.stringify(skills) : null, industry, location, qualification, duties, req.params.id]
    );

    await audit.log(req, "JOB_UPDATE", "jobs", req.params.id, {});
    res.json({ ok: true });
  })
);

// ── GET /api/jobs/:id/applicants — employer views pipeline ─────────────────
jobsRouter.delete(
  "/:id",
  requireAuth, requireRole("employer", "admin"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT employer_id FROM jobs WHERE id = ? LIMIT 1", [req.params.id]);
    const job = (rows as any[])[0];
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (!req.user!.roles.includes("admin") && job.employer_id !== req.user!.sub) {
      return res.status(403).json({ error: "You do not own this job." });
    }

    await db.execute("DELETE FROM jobs WHERE id = ?", [req.params.id]);
    await audit.log(req, "JOB_DELETE", "jobs", req.params.id, {});
    res.json({ ok: true });
  })
);

jobsRouter.get(
  "/:id/applicants",
  requireAuth, requireRole("employer", "admin"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query("SELECT employer_id FROM jobs WHERE id = ? LIMIT 1", [req.params.id]);
    const job = (rows as any[])[0];
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (!req.user!.roles.includes("admin") && job.employer_id !== req.user!.sub) {
      return res.status(403).json({ error: "Access denied." });
    }

    const [applicants] = await db.query(
      `SELECT a.id AS application_id, a.status, a.cover_letter, a.created_at,
              u.id AS user_id, u.full_name, u.email, u.avatar_file_id,
              ap.headline, ap.location, ap.skills,
              (SELECT COUNT(*) FROM on_chain_attestations oca
               JOIN verification_requests vr ON vr.id = oca.request_id
               JOIN documents d ON d.id = vr.document_id
               WHERE d.applicant_id = u.id AND oca.revoked = 0) AS verified_docs
       FROM applications a
       JOIN users u ON u.id = a.applicant_id
       LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.json({ applicants });
  })
);
