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
  "on_chain_attestations",
  "notifications",
  "audit_logs",
] as const;

async function main() {
  await db.query("SELECT 1");

  const [tablesRows] = await db.query("SHOW TABLES");
  const tables = new Set(
    (tablesRows as Array<Record<string, string>>).flatMap((row) => Object.values(row))
  );

  const missing = requiredTables.filter((table) => !tables.has(table));
  if (missing.length > 0) {
    throw new Error(`Database schema is missing required tables: ${missing.join(", ")}`);
  }

  const [adminRows] = await db.query(
    "SELECT COUNT(*) AS count FROM user_roles WHERE role = 'admin'"
  );
  const adminCount = Number((adminRows as Array<{ count: number }>)[0]?.count ?? 0);

  const [bucketRows] = await db.query(
    "SELECT COUNT(DISTINCT appwrite_bucket) AS count FROM documents WHERE appwrite_bucket IS NOT NULL"
  );
  const bucketCount = Number((bucketRows as Array<{ count: number }>)[0]?.count ?? 0);

  if (bucketCount > 1) {
    throw new Error("Documents reference more than one Appwrite bucket.");
  }

  console.log(`Database ok: ${requiredTables.length} tables present, ${adminCount} admin role(s), ${bucketCount} file bucket(s) in use.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}).finally(async () => {
  await db.close().catch(() => undefined);
});
