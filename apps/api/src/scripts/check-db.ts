import "../lib/env.js";
import { db } from "../lib/db.js";

const requiredTables = [
  "users",
  "user_roles",
  "applicant_profiles",
  "employer_profiles",
  "institutions",
  "institution_members",
  "jobs",
  "applications",
  "interviews",
  "documents",
  "verification_requests",
  "mockchain_attestations",
  "notifications",
  "conversations",
  "conversation_participants",
  "messages",
  "audit_logs",
] as const;

async function main() {
  await db.query("SELECT 1");

  const [tablesRows] = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  const tables = new Set((tablesRows as Array<{ table_name: string }>).map(row => row.table_name));

  const missing = requiredTables.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    throw new Error(`Database schema is missing required tables: ${missing.join(", ")}`);
  }

  const [ledgerHealthRows] = await db.query(
    `SELECT
       to_regprocedure('public.append_mockchain_attestation(uuid,text,uuid,text,uuid)') IS NOT NULL AS has_append_function,
       to_regclass('public.uq_mockchain_active_document_hash') IS NOT NULL AS has_active_unique_index,
       EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conrelid = 'public.mockchain_attestations'::regclass
           AND conname = 'mockchain_attestations_request_id_fkey'
           AND confdeltype = 'r'
       ) AS preserves_attestations`
  );
  const ledgerHealth = (ledgerHealthRows as Array<{
    has_append_function: boolean;
    has_active_unique_index: boolean;
    preserves_attestations: boolean;
  }>)[0];
  if (!ledgerHealth?.has_append_function || !ledgerHealth.has_active_unique_index || !ledgerHealth.preserves_attestations) {
    throw new Error("Supabase mockchain ledger constraints or append function are missing. Re-apply the current schema migration.");
  }

  const [adminRows] = await db.query(
    "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'"
  );
  const adminCount = Number((adminRows as Array<{ count: number }>)[0]?.count ?? 0);
  if (adminCount < 1) {
    throw new Error("No administrator role is registered. Run npm run seed:admin after configuring ADMIN_EMAIL.");
  }

  const expectedAdminId = process.env.ADMIN_SUPABASE_USER_ID?.trim();
  const expectedAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (expectedAdminId || expectedAdminEmail) {
    const clauses: string[] = [];
    const params: string[] = [];
    if (expectedAdminId) {
      clauses.push("u.supabase_user_id = ?");
      params.push(expectedAdminId);
    }
    if (expectedAdminEmail) {
      clauses.push("LOWER(u.email) = ?");
      params.push(expectedAdminEmail);
    }

    const [configuredAdminRows] = await db.query(
      `SELECT u.id, u.email, u.is_active
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'admin'
       WHERE ${clauses.join(" OR ")}
       LIMIT 1`,
      params
    );
    const configuredAdmin = (configuredAdminRows as Array<{ is_active: boolean }>)[0];
    if (!configuredAdmin) {
      throw new Error("The configured ADMIN_EMAIL/ADMIN_SUPABASE_USER_ID does not have the admin role.");
    }
    if (!configuredAdmin.is_active) {
      throw new Error("The configured administrator exists but is inactive.");
    }
  }

  const [bucketRows] = await db.query(
    "SELECT COUNT(DISTINCT storage_bucket) AS count FROM documents WHERE storage_bucket IS NOT NULL"
  );
  const bucketCount = Number((bucketRows as Array<{ count: number }>)[0]?.count ?? 0);

  if (bucketCount > 1) {
    throw new Error("Documents reference more than one Supabase Storage bucket.");
  }

  console.log(`Database ok: ${requiredTables.length} tables present, Supabase mockchain ledger protected, ${adminCount} admin role(s), ${bucketCount} file bucket(s) in use.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}).finally(async () => {
  await db.close().catch(() => undefined);
});
