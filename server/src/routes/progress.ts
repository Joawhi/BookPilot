import { Router } from "express";
import { prisma } from "../db.ts";
import { parseJson } from "../db/json.ts";
import { toNoteRecord } from "../db/map.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import type { GameType, ProgressPayload, SessionRecap } from "../../../shared/types.ts";

export const progressRouter = Router({ mergeParams: true });

progressRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await prisma.studySet.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!set) throw new HttpError(404, "Study set not found.", "not_found");

    const [notes, recapRows, results, concepts] = await Promise.all([
      prisma.note.findMany({
        where: { studySetId: set.id },
        orderBy: { createdAt: "desc" },
        include: { document: true },
      }),
      prisma.readingSession.findMany({
        where: { studySetId: set.id, endedAt: { not: null } },
        orderBy: { endedAt: "desc" },
      }),
      prisma.gameResult.findMany({
        where: { studySetId: set.id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.concept.findMany({
        where: { studySetId: set.id, missCount: { gt: 0 } },
        orderBy: { missCount: "desc" },
        take: 12,
      }),
    ]);

    const bestScores: ProgressPayload["bestScores"] = {};
    for (const r of results) {
      const t = r.gameType as GameType;
      bestScores[t] = Math.max(bestScores[t] ?? 0, r.score);
    }

    const recaps: SessionRecap[] = recapRows.map((s) => ({
      id: s.id,
      recap: s.recap ?? "",
      references: parseJson(s.references, []),
      endedAt: s.endedAt!.toISOString(),
    }));

    const payload: ProgressPayload = {
      notes: notes.map(toNoteRecord),
      recaps,
      totalPoints: set.totalPoints,
      bestScores,
      accuracyOverTime: results.map((r) => ({
        date: r.createdAt.toISOString(),
        accuracy: r.accuracy,
        gameType: r.gameType as GameType,
      })),
      topicsToReview: concepts.map((c) => ({
        name: c.name,
        missCount: c.missCount,
        hitCount: c.hitCount,
      })),
      recentResults: results
        .slice(-12)
        .reverse()
        .map((r) => ({
          id: r.id,
          gameType: r.gameType as GameType,
          score: r.score,
          accuracy: r.accuracy,
          bestStreak: r.bestStreak,
          missedConcepts: parseJson(r.missedConcepts, []),
          createdAt: r.createdAt.toISOString(),
        })),
    };
    res.json(payload);
  }),
);
