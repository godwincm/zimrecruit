import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "zimrecruit-media";

let adminClient: SupabaseClient | null = null;

function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured for Supabase.`);
  }
  return value;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      requireValue("SUPABASE_URL"),
      requireValue("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient;
}

export async function getSupabaseUser(userId: string): Promise<User> {
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw Object.assign(new Error("Supabase user account could not be found."), { status: 401 });
  }
  return data.user;
}

export async function verifySupabaseAccessToken(accessToken: string, expectedUserId: string): Promise<User> {
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user || data.user.id !== expectedUserId) {
    throw Object.assign(new Error("Supabase session does not match the requested user."), { status: 401 });
  }
  if (!data.user.email || !data.user.email_confirmed_at) {
    throw Object.assign(new Error("Confirm your email address before logging in."), { status: 403 });
  }
  return data.user;
}

export async function downloadFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    throw error ?? new Error("Unable to download file from Supabase Storage.");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function getFileMetadata(storagePath: string): Promise<{ mimeType: string; sizeOriginal: number }> {
  const { data, error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    throw error ?? new Error("Unable to retrieve file metadata from Supabase Storage.");
  }
  return { mimeType: data.type || "application/octet-stream", sizeOriginal: data.size };
}

export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([storagePath]);
  if (error) throw error;
}
