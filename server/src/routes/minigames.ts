import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { parseJson } from "../db/json.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { enqueueGeneration } from "../services/generation.ts";
import { saveGameResult } from "../services/results.ts";
import { GAME_TYPES, MINIGAME_TYPES } from "../../../shared/constants.ts";
import type {
  FillBlankItem,
  MatchPair,
  MinigamePayload,
  SequencePuzzle,
  TrueFalseItem,
} from "../../../shared/types.ts";

export const minigamesRouter = Router({ mergeParams: true });

async function ownedSet(userId: string, id: string) {
  const set = await prisma.studySet.findFirst({ where: { id, userId } });
  if (!set) throw new HttpError(404, "Study set not found.", "not_found");
  return set;
}

function toPayload(type: string, raw: string, generatedAt: Date): MinigamePayload {
  const parsed = parseJson<Record<string, unknown>>(raw, {});
  const payload: MinigamePayload = {
    type: type as MinigamePayload["type"],
    generatedAt: generatedAt.toISOString(),
  };
  if (type === "match_pairs") {
    const pairs = (parsed.pairs as { term: string; definition: string }[]) ?? [];
    payload.matchPairs = pairs.map((p, i) => ({
      id: String(i + 1),
      term: p.term,
      definition: p.definition,
    })) satisfies MatchPair[];
  }
  if (type === "fill_blank") {
    const items = (parsed.items as Omit<FillBlankItem, "id">[]) ?? [];
    payload.fillBlanks = items.map((it, i) => ({ ...it, id: String(i + 1) }));
  }
  if (type === "true_false") {
    const statements = (parsed.statements as Omit<TrueFalseItem, "id">[]) ?? [];
    payload.trueFalse = statements.map((it, i) => ({ ...it, id: String(i + 1) }));
  }
  if (type === "sequence_sort") {
    payload.sequences = ((parsed.puzzles as SequencePuzzle[]) ?? []).map((p, i) => ({
      ...p,
      id: p.id || String(i + 1),
    }));
  }
  return payload;
}

minigamesRouter.get(
  "/:type",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await ownedSet(user.id, req.params.id);
    const type = req.params.type;
    if (!MINIGAME_TYPES.includes(type as (typeof MINIGAME_TYPES)[number])) {
      throw new HttpError(400, "Unknown minigame.", "bad_type");
    }
    if (set.gamesStatus !== "ready") {
      throw new HttpError(409, "Minigames are still being prepared.", "not_ready");
    }
    const row = await prisma.minigameContent.findUnique({
      where: { studySetId_type: { studySetId: set.id, type } },
    });
    if (!row) throw new HttpError(404, "Content not generated yet.", "not_found");
    res.json(toPayload(type, row.content, row.generatedAt));
  }),
);

minigamesRouter.post(
  "/:type/regenerate",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await ownedSet(user.id, req.params.id);
    enqueueGeneration(set.id, "games").catch(console.error);
    res.json({ ok: true, status: "generating" });
  }),
);

export const gamesFinishRouter = Router({ mergeParams: true });

gamesFinishRouter.post(
  "/finish",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const set = await ownedSet(user.id, req.params.id);
    const body = z
      .object({
        gameType: z.enum(GAME_TYPES),
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
      gameType: body.gameType,
      score: body.score,
      accuracy: body.accuracy,
      bestStreak: body.bestStreak,
      missedConcepts: body.missedConcepts,
      hitConcepts: body.hitConcepts,
    });
    res.json({ id: result.id });
  }),
);
