import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
    public details?: unknown,
  ) {
    super(message);
  }
}

export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request.", code: "invalid", details: err.issues });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each PDF must be under 25MB." : err.message;
    res.status(400).json({ error: message, code: "upload" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again.", code: "internal" });
}
