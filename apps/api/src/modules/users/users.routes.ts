import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/db.js";
import { requireAuth } from "../../middleware/jwt.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const usersRouter = Router();

const UpdateProfileSchema = z.object({
  fullName:    z.string().min(2).max(150).optional(),
  phone:       z.string().max(32).optional(),
  avatarFileId:z.string().max(500).optional(),
  // Applicant profile
  headline:    z.string().max(160).optional(),
  bio:         z.string().max(5000).optional(),
  location:    z.string().max(120).optional(),
  skills:      z.array(z.string()).optional(),
  education:   z.array(z.record(z.unknown())).optional(),
  experience:  z.array(z.record(z.unknown())).optional(),
  // Employer profile
  companyName:    z.string().max(200).optional(),
  industry:       z.string().max(120).optional(),
  website:        z.string().url().optional().or(z.literal("")),
  companyLocation:z.string().max(120).optional(),
  institutionName: z.string().max(200).optional(),
  institutionCategory: z.enum(["zrp", "medical", "education"]).optional(),
  contactEmail: z.string().email().optional(),
});

// ── GET /api/me ───────────────────────────────────────────────────────────────
usersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [userRows] = await db.query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.avatar_file_id, u.is_active, u.created_at,
              string_agg(ur.role::text, ',' ORDER BY ur.role::text) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = ?
       GROUP BY u.id LIMIT 1`,
      [req.user!.sub]
    );
    const user = (userRows as any[])[0];
    if (!user) return res.status(404).json({ error: "User not found." });

    user.roles = user.roles?.split(",") ?? [];

    // Attach role-specific profile
    let profile = null;
    if (user.roles.includes("applicant")) {
      const [p] = await db.query("SELECT * FROM applicant_profiles WHERE user_id = ?", [user.id]);
      profile = (p as any[])[0] ?? null;
    } else if (user.roles.includes("employer")) {
      const [p] = await db.query("SELECT * FROM employer_profiles WHERE user_id = ?", [user.id]);
      profile = (p as any[])[0] ?? null;
    } else if (user.roles.includes("verifier")) {
      const [p] = await db.query(
        `SELECT i.*
         FROM institutions i
         JOIN institution_members im ON im.institution_id = i.id
         WHERE im.user_id = ?
         LIMIT 1`,
        [user.id]
      );
      profile = (p as any[])[0] ?? null;
    }

    res.json({ user, profile });
  })
);

// ── PATCH /api/me ─────────────────────────────────────────────────────────────
usersRouter.patch(
  "/",
  requireAuth,
  validate(UpdateProfileSchema),
  asyncHandler(async (req, res) => {
    const { fullName, phone, avatarFileId, headline, bio, location, skills, education, experience,
            companyName, industry, website, companyLocation,
            institutionName, institutionCategory, contactEmail } = req.body;
    const userId = req.user!.sub;

    if (fullName || phone !== undefined || avatarFileId) {
      await db.execute(
        `UPDATE users SET
           full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           avatar_file_id = COALESCE(?, avatar_file_id)
         WHERE id = ?`,
        [fullName, phone, avatarFileId, userId]
      );
    }

    const roles = req.user!.roles;

    if (roles.includes("applicant")) {
      await db.execute(
        `UPDATE applicant_profiles SET
           headline = COALESCE(?, headline), bio = COALESCE(?, bio),
           location = COALESCE(?, location),
           skills = COALESCE(?, skills), education = COALESCE(?, education),
           experience = COALESCE(?, experience)
         WHERE user_id = ?`,
        [headline, bio, location,
         skills ? JSON.stringify(skills) : null,
         education ? JSON.stringify(education) : null,
         experience ? JSON.stringify(experience) : null,
         userId]
      );
    }

    if (roles.includes("employer")) {
      await db.execute(
        `UPDATE employer_profiles SET
           company_name = COALESCE(?, company_name),
           location = COALESCE(?, location),
           industry = COALESCE(?, industry),
           website = COALESCE(?, website)
         WHERE user_id = ?`,
        [companyName, companyLocation, industry, website, userId]
      );
    }

    if (roles.includes("verifier")) {
      await db.execute(
        `UPDATE institutions i
         SET name = COALESCE(?, i.name),
             category = COALESCE(?, i.category),
             contact_email = COALESCE(?, i.contact_email)
         FROM institution_members im
         WHERE im.institution_id = i.id AND im.user_id = ?`,
        [institutionName, institutionCategory, contactEmail, userId]
      );
    }

    res.json({ ok: true });
  })
);
