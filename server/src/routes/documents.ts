import fs from "node:fs";
import { Router } from "express";
import { prisma } from "../db.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { toDocumentSummary } from "../db/map.ts";

export const documentsRouter = Router();

async function ownedDoc(userId: string, id: string) {
  const doc = await prisma.document.findFirst({
    where: { id, studySet: { userId } },
    include: { studySet: true },
  });
  if (!doc) throw new HttpError(404, "Document not found.", "not_found");
  return doc;
}

documentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const doc = await ownedDoc(user.id, req.params.id);
    res.json({ ...toDocumentSummary(doc), studySetId: doc.studySetId });
  }),
);

documentsRouter.get(
  "/:id/file",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const doc = await ownedDoc(user.id, req.params.id);
    if (!fs.existsSync(doc.storagePath)) {
      throw new HttpError(404, "File is missing from storage.", "missing_file");
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.originalName)}"`);
    fs.createReadStream(doc.storagePath).pipe(res);
  }),
);
