import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";

export type AuthedRequest = Request & {
  user: { id: string; email: string };
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Please sign in.", code: "unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string; email: string };
    (req as AuthedRequest).user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please sign in again.", code: "unauthorized" });
  }
}

export function signToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: "14d" });
}
