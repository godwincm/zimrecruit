import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseUser, verifySupabaseAccessToken } from "../../lib/supabase.js";
import { db } from "../../lib/db.js";
import { getJwtPrivateKey } from "../../lib/jwtKeys.js";
import { accountEmailSchema } from "../../lib/authValidation.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/jwt.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as audit from "../audit/audit.service.js";

export const authRouter = Router();

const PRIVATE_KEY = getJwtPrivateKey();

const RegisterSchema = z.object({
  supabaseUserId: z.string().uuid(),
  email: accountEmailSchema,
  fullName: z.string().min(2).max(150),
  role: z.enum(["applicant", "employer", "verifier"]),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyLocation: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  institutionName: z.string().optional(),
  institutionCategory: z.enum(["zrp", "medical", "education"]).optional(),
});

const LoginSchema = z.object({
  supabaseUserId: z.string().uuid(),
  supabaseAccessToken: z.string().min(1),
});

type DbUser = {
  id: string;
  supabase_user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
};

function signAuthTokens(user: DbUser, roles: string[]) {
  const accessToken = jwt.sign(
    { sub: user.id, supabaseUserId: user.supabase_user_id, email: user.email, roles },
    PRIVATE_KEY as jwt.Secret,
    { algorithm: "RS256", expiresIn: process.env.JWT_ACCESS_TTL ?? "15m" } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { sub: user.id, type: "refresh" },
    PRIVATE_KEY as jwt.Secret,
    { algorithm: "RS256", expiresIn: process.env.JWT_REFRESH_TTL ?? "7d" } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

async function getRoles(userId: string): Promise<string[]> {
  const [roleRows] = await db.query(
    "SELECT role FROM user_roles WHERE user_id = ?",
    [userId]
  );
  return (roleRows as { role: string }[]).map(row => row.role);
}

authRouter.post(
  "/register",
  validate(RegisterSchema),
  asyncHandler(async (req, res) => {
    const {
      supabaseUserId,
      email,
      fullName,
      role,
      phone,
      companyName,
      companyLocation,
      industry,
      website,
      institutionName,
      institutionCategory,
    } = req.body;

    const authUser = await getSupabaseUser(supabaseUserId);
    if ((authUser.email ?? "").trim().toLowerCase() !== email) {
      return res.status(422).json({ error: "Email does not match the Supabase account." });
    }
    if (role === "employer" && (!companyName || !companyLocation)) {
      return res.status(422).json({ error: "companyName and companyLocation are required for employers." });
    }
    if (role === "verifier" && !institutionName) {
      return res.status(422).json({ error: "institutionName is required for verifier institutions." });
    }

    const [existingRows] = await db.query(
      "SELECT id FROM users WHERE supabase_user_id = ? OR email = ? LIMIT 1",
      [supabaseUserId, email]
    );
    if ((existingRows as unknown[]).length) {
      return res.status(409).json({ error: "This account has already been registered." });
    }

    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO users (id, supabase_user_id, email, full_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [supabaseUserId, supabaseUserId, email, fullName, phone ?? null]
      );
      await conn.execute(
        "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
        [supabaseUserId, role]
      );

      if (role === "applicant") {
        await conn.execute("INSERT INTO applicant_profiles (user_id) VALUES (?)", [supabaseUserId]);
      }

      if (role === "employer") {
        await conn.execute(
          `INSERT INTO employer_profiles (user_id, company_name, location, contact_email, industry, website)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [supabaseUserId, companyName, companyLocation, email, industry ?? null, website || null]
        );
      }

      if (role === "verifier") {
        const institutionId = uuidv4();
        await conn.execute(
          `INSERT INTO institutions (id, name, category, contact_email)
           VALUES (?, ?, ?, ?)`,
          [
            institutionId,
            institutionName,
            institutionCategory ?? "education",
            email,
          ]
        );
        await conn.execute(
          "INSERT INTO institution_members (user_id, institution_id) VALUES (?, ?)",
          [supabaseUserId, institutionId]
        );
      }
    });

    await audit.log(req as any, "USER_REGISTER", "users", supabaseUserId, { role, email, provider: "supabase" });
    res.status(201).json({ ok: true, userId: supabaseUserId });
  })
);

authRouter.post(
  "/login",
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const { supabaseUserId, supabaseAccessToken } = req.body;
    await verifySupabaseAccessToken(supabaseAccessToken, supabaseUserId);

    const [userRows] = await db.query(
      "SELECT id, supabase_user_id, email, full_name, is_active FROM users WHERE supabase_user_id = ? LIMIT 1",
      [supabaseUserId]
    );
    const user = (userRows as DbUser[])[0];
    if (!user) return res.status(404).json({ error: "User not found. Please register first." });
    if (!user.is_active) return res.status(403).json({ error: "Account suspended." });

    const roles = await getRoles(user.id);
    const { accessToken, refreshToken } = signAuthTokens(user, roles);
    await audit.log(req as any, "AUTH_LOGIN", "users", user.id, { provider: "supabase" });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, roles },
    });
  })
);

authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  await audit.log(req, "AUTH_LOGOUT", "users", req.user!.sub, {});
  res.json({ ok: true });
}));
