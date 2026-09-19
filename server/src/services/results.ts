import { prisma } from "../db.ts";

export async function recordConcepts(
  studySetId: string,
  hits: string[],
  misses: string[],
) {
  for (const name of hits.filter(Boolean)) {
    await prisma.concept.upsert({
      where: { studySetId_name: { studySetId, name } },
      update: { hitCount: { increment: 1 } },
      create: { studySetId, name, hitCount: 1 },
    });
  }
  for (const name of misses.filter(Boolean)) {
    await prisma.concept.upsert({
      where: { studySetId_name: { studySetId, name } },
      update: { missCount: { increment: 1 } },
      create: { studySetId, name, missCount: 1 },
    });
  }
}

export async function saveGameResult(opts: {
  userId: string;
  studySetId: string;
  gameType: string;
  score: number;
  accuracy: number;
  bestStreak: number;
  missedConcepts: string[];
  hitConcepts?: string[];
}) {
  const result = await prisma.gameResult.create({
    data: {
      userId: opts.userId,
      studySetId: opts.studySetId,
      gameType: opts.gameType,
      score: opts.score,
      accuracy: opts.accuracy,
      bestStreak: opts.bestStreak,
      missedConcepts: JSON.stringify(opts.missedConcepts),
    },
  });
  await recordConcepts(opts.studySetId, opts.hitConcepts ?? [], opts.missedConcepts);
  const set = await prisma.studySet.findUniqueOrThrow({ where: { id: opts.studySetId } });
  await prisma.studySet.update({
    where: { id: opts.studySetId },
    data: {
      totalPoints: set.totalPoints + Math.max(0, opts.score),
      bestScore: Math.max(set.bestScore, opts.score),
    },
  });
  return result;
}
