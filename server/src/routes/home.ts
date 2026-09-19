import { Router } from "express";
import { prisma } from "../db.ts";
import { toSetSummary } from "../db/map.ts";
import { asyncHandler } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { llmEnabled } from "../llm/index.ts";
import type { ConfusionPoint, ContinueReading, HomePayload } from "../../../shared/types.ts";

export const homeRouter = Router();

homeRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const studySets = await prisma.studySet.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { documents: true, notes: true } } },
    });

    let continueReading: ContinueReading | null = null;
    const withCursor = studySets.find((s) => s.lastReadDocumentId);
    if (withCursor?.lastReadDocumentId) {
      const doc = await prisma.document.findFirst({
        where: { id: withCursor.lastReadDocumentId, studySet: { userId: user.id } },
      });
      if (doc) {
        continueReading = {
          studySetId: withCursor.id,
          studySetTitle: withCursor.title,
          documentId: doc.id,
          documentName: doc.originalName,
          page: withCursor.lastReadPage,
        };
      }
    }

    const flagged = await prisma.note.findMany({
      where: { userId: user.id, flagged: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { document: true, studySet: true },
    });
    const confusionPoints: ConfusionPoint[] = flagged.map((n) => ({
      noteId: n.id,
      studySetId: n.studySetId,
      studySetTitle: n.studySet.title,
      documentId: n.documentId,
      documentName: n.document.originalName,
      passage: n.passage,
      page: n.page,
      createdAt: n.createdAt.toISOString(),
    }));

    const payload: HomePayload = {
      studySets: studySets.map(toSetSummary),
      continueReading,
      confusionPoints,
      llmEnabled: llmEnabled(),
    };
    res.json(payload);
  }),
);
