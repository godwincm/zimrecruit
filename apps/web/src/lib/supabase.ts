import { createClient } from "@supabase/supabase-js";
import { validateEmailAndPassword } from "./authValidation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "zimrecruit-media";

function getJwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");

    // If we're in a browser, use atob; in Node (tests/SSR), use Buffer.
    const decoded = typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString();
    return JSON.parse(decoded).role ?? null;
  } catch {
    return null;
  }
}

function hasSafeAnonKey() {
  if (!supabaseAnonKey || supabaseAnonKey === "replace-me" || supabaseAnonKey === "your-anon-key") {
    return false;
  }
  return getJwtRole(supabaseAnonKey) === "anon";
}

export const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  hasSafeAnonKey();

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

function assertSupabaseConfigured() {
  if (!supabaseUrl || supabaseUrl === "https://your-project.supabase.co") {
    throw new Error("Supabase URL is not configured. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file.");
  }
  if (!supabaseAnonKey || supabaseAnonKey === "replace-me" || supabaseAnonKey === "your-anon-key") {
    throw new Error("Supabase anonymous key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
  }
  if (getJwtRole(supabaseAnonKey) === "service_role") {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY must be the Supabase anon key, not the service role key.");
  }
  if (!hasSafeAnonKey()) {
    throw new Error("Supabase configuration is invalid or the anon key is malformed.");
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

async function upload(file: File): Promise<string> {
  assertSupabaseConfigured();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in before uploading files.");

  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return storagePath;
}

export async function uploadDocument(file: File): Promise<string> {
  return upload(file);
}

export async function uploadMedia(file: File): Promise<{ storagePath: string; previewUrl: string }> {
  const storagePath = await upload(file);
  return { storagePath, previewUrl: await getMediaPreviewUrl(storagePath) };
}

export async function getMediaPreviewUrl(storagePath?: string | null): Promise<string> {
  if (!storagePath) return "";
  assertSupabaseConfigured();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function supabaseRegister(email: string, password: string, name: string) {
  assertSupabaseConfigured();
  const credentials = validateEmailAndPassword(email, password);
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return a registered user.");
  return data;
}

export async function supabaseLogin(email: string, password: string) {
  assertSupabaseConfigured();
  const credentials = validateEmailAndPassword(email, password);
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw error;
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("Confirm your email address before logging in.");
  }
  return data;
}

export async function supabaseLogout() {
  assertSupabaseConfigured();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
