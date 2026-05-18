import { describe, expect, it } from "vitest";
import { hexToBytes32, sha256Hex } from "./hash";

describe("hash utilities", () => {
  it("computes a 0x-prefixed SHA-256 hash", () => {
    const hash = sha256Hex(Buffer.from("hello"));
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hash).toBe(
      "0x" +
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("normalizes a valid 0x-prefixed bytes32 hex string", () => {
    const value = hexToBytes32(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    expect(value).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
  });

  it("throws for malformed hex values", () => {
    expect(() => hexToBytes32("0x1234")).toThrow("Invalid SHA-256 hash");
    expect(() => hexToBytes32("not-hex")).toThrow("Invalid SHA-256 hash");
  });
});
