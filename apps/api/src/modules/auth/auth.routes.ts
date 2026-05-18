import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { appwriteUsers, verifyAppwriteJwt } from "../../lib/appwrite.js";
import { db } from "../../lib/db.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/jwt.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import * as audit from "../audit/audit.service.js";

export const authRouter = Router();

const PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY_PEM ?? "").replace(/\\n/g, "\n");

// ── Schemas ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  appwriteUserId: z.string().min(1),
  email:          z.string().email(),
  fullName:       z.string().min(2).max(150),
  role:           z.enum(["applicant", "employer", "verifier"]),
  phone:          z.string().optional(),
  // Employer extras
  companyName:    z.string().optional(),
  companyLocation:z.string().optional(),
  industry:       z.string().optional(),
  website:        z.string().url().optional().or(z.literal("")),
  institutionName: z.string().optional(),
  institutionCategory: z.enum(["zrp", "medical", "education"]).optional(),
  institutionWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const LoginSchema = z.object({
  appwriteUserId: z.string().min(1),
  appwriteJwt: z.string().min(1),
});

// ── POST /api/auth/register ──────────────────────────────────────────────────
authRouter.post(
  "/register",
  validate(RegisterSchema),
  asyncHandler(async (req, res) => {
    const {
      appwriteUserId,
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
      institutionWallet,
    } = req.body;

    // Verify the Appwrite user exists
    await appwriteUsers.get(appwriteUserId);

    const userId = uuidv4();

    await db.transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO users (id, appwrite_id, email, full_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, appwriteUserId, email, fullName, phone ?? null]
      );

      await conn.execute(
        "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
        [userId, role]
      );

      if (role === "applicant") {
        await conn.execute(
          "INSERT INTO applicant_profiles (user_id) VALUES (?)",
          [userId]
        );
      }

      if (role === "employer") {
        if (!companyName || !companyLocation) {
          throw Object.assign(new Error("companyName and companyLocation are required for employers."), { status: 422 });
        }
        await conn.execute(
          `INSERT INTO employer_profiles (user_id, company_name, location, contact_email, industry, website)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, companyName, companyLocation, email, industry ?? null, website ?? null]
        );
      }

      if (role === "verifier") {
        if (!institutionName) {
          throw Object.assign(new Error("institutionName is required for verifier institutions."), { status: 422 });
        }
        const institutionId = uuidv4();
        const walletAddress =
          institutionWallet ??
          process.env.VERIFIER_WALLET_ADDRESS ??
          "0x0000000000000000000000000000000000000001";
        await conn.execute(
          `INSERT INTO institutions (id, name, category, wallet_address, contact_email)
           VALUES (?, ?, ?, ?, ?)`,
          [institutionId, institutionName, institutionCategory ?? "education", walletAddress, email]
        );
        await conn.execute(
          "INSERT INTO institution_members (user_id, institution_id) VALUES (?, ?)",
          [userId, institutionId]
        );
      }
    });

    await audit.log(req as any, "USER_REGISTER", "users", userId, { role, email });

    res.status(201).json({ ok: true, userId });
  })
);

// ── POST /api/auth/login ─────────────────────────────────────────────────────
authRouter.post(
  "/login",
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const { appwriteUserId, appwriteJwt } = req.body;

    const appwriteUser = await verifyAppwriteJwt(appwriteJwt, appwriteUserId);
    if (appwriteUser.status === false) {
      return res.status(403).json({ error: "Account suspended." });
    }

    // Fetch MySQL user + roles
    const [userRows] = await db.query(
      "SELECT u.id, u.email, u.full_name, u.is_active FROM users u WHERE u.appwrite_id = ? LIMIT 1",
      [appwriteUserId]
    );
    const user = (userRows as any[])[0];
    if (!user) return res.status(404).json({ error: "User not found. Please register first." });
    if (!user.is_active) return res.status(403).json({ error: "Account suspended." });

    const [roleRows] = await db.query(
      "SELECT role FROM user_roles WHERE user_id = ?",
      [user.id]
    );
    const roles = (roleRows as { role: string }[]).map(r => r.role);

    // Issue RS256 access JWT
    const accessToken = jwt.sign(
      { sub: user.id, appwriteId: appwriteUserId, email: user.email, roles },
      PRIVATE_KEY as jwt.Secret,
      { algorithm: "RS256", expiresIn: process.env.JWT_ACCESS_TTL ?? "15m" } as jwt.SignOptions
    );

    // Issue refresh token (opaque, stored in Redis in production)
    const refreshToken = jwt.sign(
      { sub: user.id, type: "refresh" },
      PRIVATE_KEY as jwt.Secret,
      { algorithm: "RS256", expiresIn: process.env.JWT_REFRESH_TTL ?? "7d" } as jwt.SignOptions
    );

    await audit.log(req as any, "AUTH_LOGIN", "users", user.id, {});

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, roles },
    });
  })
);

// ── POST /api/auth/logout ────────────────────────────────────────────────────
authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  // In production: add JWT jti to Redis deny-list here
  await audit.log(req, "AUTH_LOGOUT", "users", req.user!.sub, {});
  res.json({ ok: true });
}));
