import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { toJson } from "../db/json.ts";
import { toNoteRecord } from "../db/map.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";

export const notesRouter = Router();

notesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const studySetId = typeof req.query.studySetId === "string" ? req.query.studySetId : undefined;
    const flagged = req.query.flagged === "true" ? true : undefined;
    const rows = await prisma.note.findMany({
      where: {
        userId: user.id,
        studySetId,
        flagged,
      },
      orderBy: { createdAt: "desc" },
      include: { document: true },
    });
    res.json(rows.map(toNoteRecord));
  }),
);

notesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z
      .object({
        studySetId: z.string(),
        documentId: z.string(),
        passage: z.string().min(1).max(8000),
        page: z.number().int().min(1),
        explanation: z.string().max(4000).optional(),
        references: z.unknown().optional(),
        flagged: z.boolean().optional(),
        comment: z.string().max(4000).optional(),
      })
      .parse(req.body);
    const set = await prisma.studySet.findFirst({ where: { id: body.studySetId, userId: user.id } });
    if (!set) throw new HttpError(404, "Study set not found.", "not_found");
    const doc = await prisma.document.findFirst({ where: { id: body.documentId, studySetId: set.id } });
    if (!doc) throw new HttpError(404, "Document not found.", "not_found");
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        studySetId: set.id,
        documentId: doc.id,
        passage: body.passage,
        page: body.page,
        explanation: body.explanation ?? null,
        references: toJson(body.references ?? []),
        flagged: body.flagged ?? false,
        comment: body.comment ?? null,
      },
      include: { document: true },
    });
    res.status(201).json(toNoteRecord(note));
  }),
);

notesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z
      .object({
        comment: z.string().max(4000).optional(),
        flagged: z.boolean().optional(),
        explanation: z.string().max(4000).optional(),
        references: z.unknown().optional(),
      })
      .parse(req.body);
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Note not found.", "not_found");
    const note = await prisma.note.update({
      where: { id: existing.id },
      data: {
        comment: body.comment ?? existing.comment,
        flagged: body.flagged ?? existing.flagged,
        explanation: body.explanation ?? existing.explanation,
        references: body.references !== undefined ? toJson(body.references) : existing.references,
      },
      include: { document: true },
    });
    res.json(toNoteRecord(note));
  }),
);

notesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const existing = await prisma.note.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Note not found.", "not_found");
    await prisma.note.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  }),
);
