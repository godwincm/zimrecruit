import "../lib/env.js";
import { v4 as uuidv4 } from "uuid";
import { appwriteUsers } from "../lib/appwrite.js";
import { db } from "../lib/db.js";

const requestedAppwriteUserId = process.env.ADMIN_APPWRITE_USER_ID?.trim();
const email = process.env.ADMIN_EMAIL?.trim();
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "ZimRecruit Administrator";
const phone = process.env.ADMIN_PHONE?.trim() || null;
const password = process.env.ADMIN_PASSWORD?.trim();

async function main() {
  if (!email) {
    throw new Error("ADMIN_EMAIL is required.");
  }

  let appwriteUserId = requestedAppwriteUserId;
  if (appwriteUserId) {
    try {
      await appwriteUsers.get(appwriteUserId);
    } catch (err: any) {
      if (!password) throw err;
      await appwriteUsers.create(appwriteUserId, email, undefined, password, fullName);
    }
  } else {
    if (!password) {
      throw new Error("Set ADMIN_APPWRITE_USER_ID for an existing Appwrite user, or set ADMIN_PASSWORD so the script can create one.");
    }
    appwriteUserId = uuidv4();
    await appwriteUsers.create(appwriteUserId, email, undefined, password, fullName);
  }

  const [existingRows] = await db.query(
    "SELECT id FROM users WHERE appwrite_id = ? OR email = ? LIMIT 1",
    [appwriteUserId, email]
  );
  const existing = (existingRows as Array<{ id: string }>)[0];
  const userId = existing?.id ?? uuidv4();

  await db.transaction(async (conn) => {
    if (existing) {
      await conn.execute(
        `UPDATE users
         SET appwrite_id = ?, email = ?, full_name = ?, phone = COALESCE(?, phone), is_active = 1
         WHERE id = ?`,
        [appwriteUserId, email, fullName, phone, userId]
      );
    } else {
      await conn.execute(
        `INSERT INTO users (id, appwrite_id, email, full_name, phone)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, appwriteUserId, email, fullName, phone]
      );
    }

    await conn.execute(
      "INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'admin')",
      [userId]
    );
  });

  console.log(`Admin ready: ${email} (${userId})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}).finally(async () => {
  await db.close().catch(() => undefined);
});
