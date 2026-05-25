import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  code?: string;
  errors?: unknown[];
}

interface ErrorWithConnectionMeta extends Error {
  code?: string;
  syscall?: string;
  address?: string;
  port?: number;
}

function formatCause(cause: unknown): string {
  if (!(cause instanceof Error)) {
    return String(cause);
  }

  const meta = cause as ErrorWithConnectionMeta;
  const details = [
    meta.code,
    meta.syscall,
    meta.address,
    meta.port,
  ].filter(Boolean);

  return details.length > 0
    ? `${cause.message} (${details.join(" ")})`
    : cause.message;
}

function formatErrorMessage(err: AppError): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return `${err.message}: ${err.errors.map(formatCause).join("; ")}`;
  }

  return err.message;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const isDev  = process.env.NODE_ENV !== "production";
  const message = formatErrorMessage(err);

  console.error(`[error] ${message}`, isDev ? err.stack : "");

  res.status(status).json({
    error: status === 500 && !isDev ? "Internal server error." : message,
    ...(isDev && { stack: err.stack }),
  });
}

/** Wrap async route handlers to forward errors to errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
