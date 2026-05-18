import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const isDev  = process.env.NODE_ENV !== "production";

  console.error(`[error] ${err.message}`, isDev ? err.stack : "");

  res.status(status).json({
    error: status === 500 && !isDev ? "Internal server error." : err.message,
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
