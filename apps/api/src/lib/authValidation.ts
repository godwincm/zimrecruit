import { z } from "zod";

export const accountEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");
