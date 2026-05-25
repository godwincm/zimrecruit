import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../lib/db.js";
import { requireAuth, requireRole } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { notifyUser } from "../../lib/mailer.js";
import * as audit from "../audit/audit.service.js";

export const applicationsRouter = Router();

const ApplySchema = z.object({
  jobId:       z.string().uuid(),
  coverLetter: z.string().max(3000).optional(),
});

const StageSchema = z.object({
  status: z.enum(["shortlisted", "interview", "offer", "rejected", "withdrawn"]),
});

const InterviewSchema = z.object({
  applicationId: z.string().uuid(),
  scheduledAt:   z.string().datetime({ offset: true }),
  location:      z.string().max(255),
  notes:         z.string().max(2000).optional(),
});

// ── POST /api/applications — applicant applies for a job ──────────────────────
applicationsRouter.post(
  "/",
  requireAuth, requireRole("applicant"),
  validate(ApplySchema),
  asyncHandler(async (req, res) => {
    const { jobId, coverLetter } = req.body;
    const applicantId = req.user!.sub;

    // Verify job is open
    const [jobRows] = await db.query(
      "SELECT id, status, deadline, employer_id FROM jobs WHERE id = ? LIMIT 1",
      [jobId]
    );
    const job = (jobRows as any[])[0];
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (job.status !== "open") return res.status(409).json({ error: "This job is no longer accepting applications." });
    if (new Date(job.deadline) < new Date()) return res.status(409).json({ error: "Application deadline has passed." });

    const id = uuidv4();
    await db.execute(
      "INSERT INTO applications (id, job_id, applicant_id, cover_letter) VALUES (?, ?, ?, ?)",
      [id, jobId, applicantId, coverLetter ?? null]
    );

    await audit.log(req, "JOB_APPLY", "applications", id, { jobId });
    res.status(201).json({ ok: true, applicationId: id });
  })
);

// ── GET /api/applications/mine — applicant views their applications ────────────
applicationsRouter.get(
  "/mine",
  requireAuth, requireRole("applicant"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT a.*, j.title AS job_title, j.location, ep.company_name, ep.logo_file_id,
              i.scheduled_at, i.location AS interview_location
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN employer_profiles ep ON ep.user_id = j.employer_id
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.applicant_id = ?
       ORDER BY a.created_at DESC`,
      [req.user!.sub]
    );
    res.json({ applications: rows });
  })
);

// ── PATCH /api/applications/:id — employer moves stage ────────────────────────
applicationsRouter.patch(
  "/:id",
  requireAuth, requireRole("employer", "admin"),
  validate(StageSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // Verify employer owns the job
    const [rows] = await db.query(
      `SELECT a.id, a.applicant_id, j.employer_id, j.title AS job_title, ep.company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN employer_profiles ep ON ep.user_id = j.employer_id
       WHERE a.id = ? LIMIT 1`,
      [id]
    );
    const app = (rows as any[])[0];
    if (!app) return res.status(404).json({ error: "Application not found." });

    const isAdmin = req.user!.roles.includes("admin");
    if (!isAdmin && app.employer_id !== req.user!.sub) {
      return res.status(403).json({ error: "Access denied." });
    }

    await db.execute("UPDATE applications SET status = ? WHERE id = ?", [status, id]);
    await audit.log(req, "APP_STAGE_CHANGE", "applications", id, { status });

    if (status === "shortlisted") {
      await notifyUser("application_accepted", app.applicant_id, {
        jobTitle: app.job_title,
        company: app.company_name,
      }).catch(console.warn);
    }

    if (status === "offer") {
      await notifyUser("offer_extended", app.applicant_id, {
        jobTitle: app.job_title,
        company: app.company_name,
      }).catch(console.warn);
    }

    res.json({ ok: true, status });
  })
);

// ── POST /api/interviews — schedule an interview ──────────────────────────────
applicationsRouter.delete(
  "/:id",
  requireAuth, requireRole("applicant", "employer", "admin"),
  asyncHandler(async (req, res) => {
    const [rows] = await db.query(
      `SELECT a.applicant_id, j.employer_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    const application = (rows as any[])[0];
    if (!application) return res.status(404).json({ error: "Application not found." });

    const isAdmin = req.user!.roles.includes("admin");
    const isOwner = application.applicant_id === req.user!.sub || application.employer_id === req.user!.sub;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Access denied." });
    }

    await db.execute("DELETE FROM applications WHERE id = ?", [req.params.id]);
    await audit.log(req, "APP_DELETE", "applications", req.params.id, {});
    res.json({ ok: true });
  })
);

applicationsRouter.post(
  "/interviews",
  requireAuth, requireRole("employer", "admin"),
  validate(InterviewSchema),
  asyncHandler(async (req, res) => {
    const { applicationId, scheduledAt, location, notes } = req.body;

    const [appRows] = await db.query(
      `SELECT a.id, a.applicant_id, j.title AS job_title, j.employer_id, ep.company_name
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN employer_profiles ep ON ep.user_id = j.employer_id
       WHERE a.id = ? LIMIT 1`,
      [applicationId]
    );
    const app = (appRows as any[])[0];
    if (!app) return res.status(404).json({ error: "Application not found." });

    const isAdmin = req.user!.roles.includes("admin");
    if (!isAdmin && app.employer_id !== req.user!.sub) {
      return res.status(403).json({ error: "Access denied." });
    }

    const id = uuidv4();
    await db.execute(
      "INSERT INTO interviews (id, application_id, scheduled_at, location, notes) VALUES (?, ?, ?, ?, ?)",
      [id, applicationId, new Date(scheduledAt), location, notes ?? null]
    );
    await db.execute("UPDATE applications SET status='interview' WHERE id=?", [applicationId]);
    await audit.log(req, "INTERVIEW_SCHEDULE", "interviews", id, { applicationId, scheduledAt });

    const formattedDate = new Date(scheduledAt).toLocaleString("en-ZW", { timeZone: "Africa/Harare" });
    await notifyUser("interview_scheduled", app.applicant_id, {
      jobTitle: app.job_title,
      company: app.company_name,
      scheduledAt: formattedDate,
      location,
    }).catch(console.warn);

    res.status(201).json({ ok: true, interviewId: id });
  })
);
