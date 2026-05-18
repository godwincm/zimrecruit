import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validate req.body against a Zod schema.
 * Returns 422 with structured field errors on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = flattenZodErrors(result.error);
      res.status(422).json({ error: "Validation failed.", fields: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

function flattenZodErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_root";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
