import { Account, Client, Messaging, Storage, Users } from "node-appwrite";

export const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ??
  process.env.VITE_APPWRITE_ENDPOINT ??
  process.env.REACT_APP_APPWRITE_ENDPOINT ??
  "https://cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.VITE_APPWRITE_PROJECT_ID ??
  process.env.REACT_APP_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const appwriteStorage = new Storage(client);
export const appwriteUsers = new Users(client);
export const appwriteMessaging = new Messaging(client);

export const BUCKETS = {
  media:
    process.env.APPWRITE_BUCKET_MEDIA ??
    process.env.APPWRITE_BUCKET_ID ??
    process.env.VITE_APPWRITE_BUCKET_ID ??
    process.env.REACT_APP_APPWRITE_BUCKET_ID ??
    "zimrecruit-media",
} as const;

export const APPWRITE_MEDIA_BUCKET_ID = BUCKETS.media;

export async function verifyAppwriteJwt(jwt: string, expectedUserId: string) {
  const sessionClient = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID!)
    .setJWT(jwt);
  const account = new Account(sessionClient);
  const user = await account.get();
  if (user.$id !== expectedUserId) {
    throw Object.assign(new Error("Appwrite session does not match the requested user."), { status: 401 });
  }
  return user;
}

export async function downloadFile(
  bucketId: string,
  fileId: string
): Promise<Buffer> {
  const arrayBuffer = await appwriteStorage.getFileDownload(bucketId, fileId);
  return Buffer.from(arrayBuffer);
}

export function getSignedPreviewUrl(bucketId: string, fileId: string): string {
  return `/api/documents/${fileId}/stream?bucket=${bucketId}`;
}
