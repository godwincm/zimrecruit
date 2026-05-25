import { describe, expect, it } from "vitest";
import { accountEmailSchema, strongPasswordSchema } from "./authValidation";

describe("authentication validation", () => {
  it("normalizes an email address before authentication", () => {
    expect(accountEmailSchema.parse(" Applicant@Example.CO.ZW ")).toBe("applicant@example.co.zw");
  });

  it("rejects malformed email addresses", () => {
    expect(() => accountEmailSchema.parse("not-an-email")).toThrow();
  });

  it("accepts a sufficiently strong password", () => {
    expect(strongPasswordSchema.parse("Forest!Trail92")).toBe("Forest!Trail92");
  });

  it.each(["Short!2A", "onlylowercase!12", "ONLYUPPERCASE!12", "NoNumbers!Here", "NoSymbolsHere12"])(
    "rejects a weak password: %s",
    (password) => {
      expect(() => strongPasswordSchema.parse(password)).toThrow();
    }
  );
});
