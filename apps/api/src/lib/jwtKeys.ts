import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const fileCandidates = [
  process.cwd(),
  path.resolve(process.cwd(), ".."),
  path.resolve(process.cwd(), "../.."),
];

function normalizePem(value?: string): string {
  return (value ?? "").trim().replace(/\\n/g, "\n");
}

function readFirstExisting(fileName: string): string {
  for (const dir of fileCandidates) {
    const candidate = path.join(dir, fileName);
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }
  return "";
}

function loadValidKey(
  envValue: string | undefined,
  fallbackFile: string,
  validate: (pem: string) => crypto.KeyObject
): string {
  const envPem = normalizePem(envValue);
  if (envPem) {
    try {
      validate(envPem);
      return envPem;
    } catch {
      console.warn(`JWT key in environment is invalid; falling back to ${fallbackFile}.`);
    }
  }

  const filePem = normalizePem(readFirstExisting(fallbackFile));
  if (!filePem) {
    throw new Error(`JWT key is missing. Set the environment key or provide ${fallbackFile}.`);
  }
  validate(filePem);
  return filePem;
}

export function getJwtPrivateKey(): string {
  return loadValidKey(process.env.JWT_PRIVATE_KEY_PEM, "private.pem", crypto.createPrivateKey);
}

export function getJwtPublicKey(): string {
  return loadValidKey(process.env.JWT_PUBLIC_KEY_PEM, "pub.pem", crypto.createPublicKey);
}
