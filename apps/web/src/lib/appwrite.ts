import { Client, Account, Storage, ID } from "appwrite";

const appwriteEndpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  process.env.VITE_APPWRITE_ENDPOINT ??
  process.env.REACT_APP_APPWRITE_ENDPOINT ??
  "";
const appwriteProject =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ??
  process.env.VITE_APPWRITE_PROJECT_ID ??
  process.env.REACT_APP_APPWRITE_PROJECT_ID ??
  "";

const client = new Client()
  .setEndpoint(appwriteEndpoint || "https://cloud.appwrite.io/v1")
  .setProject(appwriteProject || "missing-project-id");

export const account = new Account(client);
export const storage  = new Storage(client);

export const BUCKETS = {
  media:
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ??
    process.env.NEXT_PUBLIC_APPWRITE_BUCKET_MEDIA ??
    process.env.VITE_APPWRITE_BUCKET_ID ??
    process.env.REACT_APP_APPWRITE_BUCKET_ID ??
    "zimrecruit-media",
} as const;

function assertAppwriteConfigured() {
  if (!appwriteEndpoint || !appwriteProject) {
    throw new Error("Appwrite endpoint and project ID must be configured.");
  }
}

/** Upload a file to Appwrite Storage and return its fileId. */
export async function uploadDocument(file: File): Promise<string> {
  assertAppwriteConfigured();
  const res = await storage.createFile(BUCKETS.media, ID.unique(), file);
  return res.$id;
}

export async function uploadMedia(file: File): Promise<{ fileId: string; previewUrl: string }> {
  assertAppwriteConfigured();
  const res = await storage.createFile(BUCKETS.media, ID.unique(), file);
  return { fileId: res.$id, previewUrl: storage.getFilePreview(BUCKETS.media, res.$id, 240, 240).toString() };
}

export function getMediaPreviewUrl(fileId?: string | null) {
  if (!fileId) return "";
  assertAppwriteConfigured();
  return storage.getFilePreview(BUCKETS.media, fileId, 240, 240).toString();
}

/** Register a new user in Appwrite and return the appwriteUserId. */
export async function appwriteRegister(email: string, password: string, name: string): Promise<string> {
  assertAppwriteConfigured();
  const user = await account.create(ID.unique(), email, password, name);
  return user.$id;
}

/** Login and return the Appwrite session. */
export async function appwriteLogin(email: string, password: string) {
  assertAppwriteConfigured();
  const session = await account.createEmailPasswordSession(email, password);
  const jwt = await account.createJWT();
  return { session, jwt: jwt.jwt };
}

export async function appwriteLogout() {
  assertAppwriteConfigured();
  return account.deleteSession("current");
}

export async function getAppwriteSession() {
  assertAppwriteConfigured();
  try { return await account.getSession("current"); }
  catch { return null; }
}
