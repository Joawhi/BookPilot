import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { parseJson } from "../db/json.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { quizPoints, randomPowerup, startingPowerups } from "../services/scoring.ts";
import { saveGameResult } from "../services/results.ts";
import { POWERUP_EVERY_STREAK } from "../../../shared/constants.ts";
import type { PowerupType, QuizQuestionPublic, QuizStartPayload } from "../../../shared/types.ts";

export const quizRouter = Router({ mergeParams: true });

async function ownedSet(userId: string, id: string) {
  const set = await prisma.studySet.findFirst({ where: { id, userId } });
  if (!set) throw new HttpError(404, "Study set not found.", "not_found");
  return set;
}

quizRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await ownedSet(user.id, req.params.id);
    if (set.quizStatus !== "ready") {
      throw new HttpError(409, "Quiz is still being prepared.", "not_ready");
    }
    const rows = await prisma.quizQuestion.findMany({ where: { studySetId: set.id } });
    const docs = await prisma.document.findMany({ where: { studySetId: set.id } });
    const questions: QuizQuestionPublic[] = rows.map((q) => {
      const options = parseJson<string[]>(q.options, []);
      const distractIndexes = options
        .map((_, i) => i)
        .filter((i) => i !== q.correctIndex)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      const doc = docs.find((d) => d.id === q.sourceDocumentId);
      const pages = doc ? parseJson<{ page: number; text: string }[]>(doc.extractedText, []) : [];
      const page = pages.find((p) => p.page === (q.sourcePage ?? 1));
      return {
        id: q.id,
        question: q.question,
        options,
        difficulty: q.difficulty as QuizQuestionPublic["difficulty"],
        sourceDocumentId: q.sourceDocumentId,
        sourcePage: q.sourcePage,
        concept: q.concept,
        distractIndexes,
        hintSnippet: page?.text.slice(0, 280) ?? null,
      };
    });
    const payload: QuizStartPayload = { questions, powerups: startingPowerups(), notice: set.quizError };
    res.json(payload);
  }),
);

quizRouter.post(
  "/grade",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    await ownedSet(user.id, req.params.id);
    const body = z
      .object({
        questionId: z.string(),
        selectedIndex: z.number().int().min(0).max(3).nullable(),
        secondsLeft: z.number().min(0),
        usedPowerup: z
          .enum(["freeze_time", "double_down", "fifty_fifty", "second_chance", "hint"])
          .nullable(),
        streakBefore: z.number().int().min(0),
        secondChanceRetry: z.boolean().default(false),
        doubleDown: z.boolean().default(false),
      })
      .parse(req.body);
    const question = await prisma.quizQuestion.findFirst({
      where: { id: body.questionId, studySetId: req.params.id },
    });
    if (!question) throw new HttpError(404, "Question not found.", "not_found");
    const correct = body.selectedIndex === question.correctIndex;
    const streakAfter = correct ? body.streakBefore + 1 : 0;
    const pointsAwarded = quizPoints({
      correct,
      secondsLeft: body.secondsLeft,
      doubleDown: body.doubleDown,
      secondChanceRetry: body.secondChanceRetry,
      streakAfter,
      hintUsed: body.usedPowerup === "hint",
    });
    let awardedPowerup: PowerupType | null = null;
    if (correct && streakAfter > 0 && streakAfter % POWERUP_EVERY_STREAK === 0) {
      awardedPowerup = randomPowerup();
    }
    const pages = question.sourceDocumentId
      ? await prisma.document.findUnique({ where: { id: question.sourceDocumentId } })
      : null;
    let hintSnippet: string | null = null;
    if (body.usedPowerup === "hint" && pages) {
      const extracted = parseJson<{ page: number; text: string }[]>(pages.extractedText, []);
      const page = extracted.find((p) => p.page === (question.sourcePage ?? 1));
      hintSnippet = (page?.text ?? "").slice(0, 280);
    }
    res.json({
      correct,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      pointsAwarded,
      newStreak: streakAfter,
      awardedPowerup,
      hintSnippet,
    });
  }),
);

quizRouter.post(
  "/finish",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await ownedSet(user.id, req.params.id);
    const body = z
      .object({
        score: z.number(),
        accuracy: z.number().min(0).max(1),
        bestStreak: z.number().int().min(0),
        missedConcepts: z.array(z.string()),
        hitConcepts: z.array(z.string()).optional(),
      })
      .parse(req.body);
    const result = await saveGameResult({
      userId: user.id,
      studySetId: set.id,
      gameType: "quiz",
      score: body.score,
      accuracy: body.accuracy,
      bestStreak: body.bestStreak,
      missedConcepts: body.missedConcepts,
      hitConcepts: body.hitConcepts,
    });
    res.json({ id: result.id });
  }),
);
