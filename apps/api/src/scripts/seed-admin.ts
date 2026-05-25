import "../lib/env.js";
import { getSupabaseAdmin, getSupabaseUser } from "../lib/supabase.js";
import { accountEmailSchema, strongPasswordSchema } from "../lib/authValidation.js";

const requestedUserId = process.env.ADMIN_SUPABASE_USER_ID?.trim();
const email = process.env.ADMIN_EMAIL?.trim();
const fullName = process.env.ADMIN_FULL_NAME?.trim() || "ZimRecruit Administrator";
const phone = process.env.ADMIN_PHONE?.trim() || null;
const password = process.env.ADMIN_PASSWORD?.trim();

async function main() {
  if (!email) throw new Error("ADMIN_EMAIL is required.");
  const normalizedEmail = accountEmailSchema.parse(email);

  let userId = requestedUserId;
  if (userId) {
    const authUser = await getSupabaseUser(userId);
    if ((authUser.email ?? "").trim().toLowerCase() !== normalizedEmail) {
      throw new Error("ADMIN_EMAIL does not match the existing Supabase Auth user.");
    }
    if (!authUser.email_confirmed_at) {
      throw new Error("The selected Supabase administrator must confirm their email first.");
    }
  } else {
    if (!password) {
      throw new Error("Set ADMIN_SUPABASE_USER_ID for an existing Supabase user, or ADMIN_PASSWORD to create one.");
    }
    const validatedPassword = strongPasswordSchema.parse(password);
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
      email: normalizedEmail,
      password: validatedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) throw error ?? new Error("Could not create administrator in Supabase Auth.");
    userId = data.user.id;
  }

  const supabase = getSupabaseAdmin();
  const { data: existingProfile, error: profileReadError } = await supabase
    .from("users")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  if (profileReadError) throw profileReadError;

  const { error: userError } = await supabase
    .from("users")
    .upsert({
      id: userId,
      supabase_user_id: userId,
      email: normalizedEmail,
      full_name: fullName,
      phone: phone ?? existingProfile?.phone ?? null,
      is_active: true,
    }, { onConflict: "id" });
  if (userError) throw userError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleError) throw roleError;

  console.log(`Admin ready: ${normalizedEmail} (${userId})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
