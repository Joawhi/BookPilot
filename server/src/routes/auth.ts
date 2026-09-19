import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.ts";
import { requireAuth, signToken, type AuthedRequest } from "../middleware/auth.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";

export const authRouter = Router();

const creds = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(60).optional(),
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = creds.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) throw new HttpError(409, "An account with that email already exists.", "email_taken");
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash: await bcrypt.hash(body.password, 10),
        displayName: body.displayName?.trim() || body.email.split("@")[0]!,
      },
    });
    const publicUser = { id: user.id, email: user.email, displayName: user.displayName };
    res.status(201).json({ token: signToken(user), user: publicUser });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = creds.pick({ email: true, password: true }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new HttpError(401, "Email or password is incorrect.", "bad_credentials");
    }
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    res.json({ id: row.id, email: row.email, displayName: row.displayName });
  }),
);
