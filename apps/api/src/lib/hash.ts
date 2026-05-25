import { createHash } from "node:crypto";

/**
 * Compute a 0x-prefixed SHA-256 hex digest from a buffer.
 * Always computed server-side — never trust a client-supplied hash.
 *
 * @example
 *   const hash = sha256Hex(fileBuffer);
 *   // → "0xab34cd56ef78..."
 */
export function sha256Hex(buf: Buffer): string {
  return "0x" + createHash("sha256").update(buf).digest("hex");
}

/**
 * Validate and normalize the application's 0x-prefixed SHA-256 receipt lookup format.
 */
export function hexToBytes32(hex: string): string {
  const raw = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error(`Invalid SHA-256 hash: "${hex}"`);
  }
  return "0x" + raw;
}
