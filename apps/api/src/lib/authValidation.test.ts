import { describe, expect, it } from "vitest";
import { accountEmailSchema, strongPasswordSchema } from "./authValidation";

describe("server authentication validation", () => {
  it("normalizes administrator email addresses", () => {
    expect(accountEmailSchema.parse(" Admin@Example.com ")).toBe("admin@example.com");
  });

  it("accepts strong administrator bootstrap passwords", () => {
    expect(strongPasswordSchema.parse("Forest!Trail92")).toBe("Forest!Trail92");
  });

  it("rejects weak administrator bootstrap passwords", () => {
    expect(() => strongPasswordSchema.parse("godwinmasona20")).toThrow();
  });
});
