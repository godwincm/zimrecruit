import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;         // users.id (UUID)
  appwriteId: string;  // Appwrite user ID
  email: string;
  roles: Role[];
  iat: number;
  exp: number;
}

export type Role = "applicant" | "employer" | "verifier" | "admin";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY_PEM ?? "").replace(/\\n/g, "\n");

/**
 * Verify the Bearer JWT issued by the auth module.
 * Attaches the decoded payload to req.user on success.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header." });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
    }) as JwtPayload;
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Token expired — please refresh." });
    } else {
      res.status(401).json({ error: "Invalid token." });
    }
  }
}

/**
 * Role-based access control.
 * Call after requireAuth.
 *
 * @example
 *   router.post("/jobs", requireAuth, requireRole("employer", "admin"), handler)
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRoles = req.user?.roles ?? [];
    const permitted = allowed.some(r => userRoles.includes(r));
    if (!permitted) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowed.join(" | ")}.`,
      });
      return;
    }
    next();
  };
}
