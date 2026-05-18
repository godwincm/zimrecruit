import { createHash } from "node:crypto";
import { Request } from "express";
import { db } from "../../lib/db.js";
import { Role } from "../../middleware/jwt.js";

export type AuditAction =
  | "DOC_UPLOAD"
  | "DOC_DELETE"
  | "VERIFY_REQUEST"
  | "VERIFY_APPROVE"
  | "VERIFY_REJECT"
  | "VERIFY_REVOKE"
  | "JOB_POST"
  | "JOB_UPDATE"
  | "JOB_DELETE"
  | "JOB_EXPIRE"
  | "JOB_APPLY"
  | "APP_DELETE"
  | "APP_STAGE_CHANGE"
  | "INTERVIEW_SCHEDULE"
  | "OFFER_EXTEND"
  | "INSTITUTION_ONBOARD"
  | "INSTITUTION_SUSPEND"
  | "INSTITUTION_DELETE"
  | "USER_SUSPEND"
  | "ADMIN_WARNING"
  | "USER_REGISTER"
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT";

interface AuditEntry {
  actorId:   string | null;
  actorRole: Role | null;
  action:    AuditAction;
  entity:    string;
  entityId:  string | null;
  metadata:  Record<string, unknown>;
  ipAddress: string;
}

async function getLastRowHash(): Promise<string> {
  const [rows] = await db.query(
    "SELECT row_hash FROM audit_logs ORDER BY id DESC LIMIT 1"
  );
  return ((rows as { row_hash: string }[])[0]?.row_hash) ?? "genesis";
}

function computeRowHash(prevHash: string, entry: Omit<AuditEntry, never>, createdAt: string): string {
  const data = JSON.stringify({ ...entry, createdAt });
  return "0x" + createHash("sha256").update(prevHash + data).digest("hex");
}

/** Append an immutable, tamper-evident entry to audit_logs. */
export async function log(
  req: Request,
  action: AuditAction,
  entity: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const actorId   = req.user?.sub ?? null;
  const actorRole = (req.user?.roles?.[0] as Role) ?? null;
  const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  const createdAt = new Date().toISOString();
  const prevHash  = await getLastRowHash();
  const rowHash   = computeRowHash(prevHash, { actorId, actorRole, action, entity, entityId, metadata, ipAddress }, createdAt);

  await db.execute(
    `INSERT INTO audit_logs
       (actor_id, actor_role, action, entity, entity_id, metadata, ip_address, prev_hash, row_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [actorId, actorRole, action, entity, entityId, JSON.stringify(metadata), ipAddress, prevHash, rowHash, createdAt]
  );
}
