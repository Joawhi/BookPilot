import { prisma } from "../db.ts";
import { parseJson, toJson } from "../db/json.ts";
import { chatJson, llmEnabled } from "../llm/index.ts";
import {
  fallbackFillBlank,
  fallbackMatchPairs,
  fallbackQuiz,
  fallbackSequence,
  fallbackTrueFalse,
} from "../llm/fallback.ts";
import {
  fillBlankPrompt,
  fillBlankSchema,
  matchPairsPrompt,
  matchPairsSchema,
  quizPrompt,
  quizSchema,
  sequencePrompt,
  sequenceSchema,
  trueFalsePrompt,
  trueFalseSchema,
} from "../llm/prompts.ts";
import { chunkPages, formatMaterial, sampleDense } from "./denseSample.ts";
import type { PageText } from "../../../shared/types.ts";
import type { MinigameType } from "../../../shared/constants.ts";

const running = new Map<string, Promise<void>>();

export function enqueueGeneration(studySetId: string, target: "quiz" | "games" | "all" = "all") {
  const prev = running.get(studySetId) ?? Promise.resolve();
  const next = prev
    .catch(() => undefined)
    .then(() => generateForStudySet(studySetId, target));
  running.set(studySetId, next);
  return next;
}

export async function recoverStuckJobs() {
  const stuck = await prisma.studySet.findMany({
    where: { OR: [{ quizStatus: "generating" }, { gamesStatus: "generating" }, { quizStatus: "pending" }, { gamesStatus: "pending" }] },
    select: { id: true },
  });
  for (const row of stuck) enqueueGeneration(row.id, "all");
}

async function loadContext(studySetId: string) {
  const set = await prisma.studySet.findUniqueOrThrow({
    where: { id: studySetId },
    include: { documents: true, notes: true, concepts: true },
  });
  const chunks = set.documents.flatMap((d) =>
    chunkPages(d.id, d.originalName, parseJson<PageText[]>(d.extractedText, [])),
  );
  const flaggedNotes = set.notes.filter((n) => n.flagged);
  const flaggedPages = new Set(flaggedNotes.map((n) => `${n.documentId}:${n.page}`));
  const sampled = sampleDense(chunks, flaggedPages, 14);
  const missed = set.concepts
    .sort((a, b) => b.missCount - a.missCount)
    .filter((c) => c.missCount > 0)
    .map((c) => c.name)
    .slice(0, 8);
  const pages = set.documents.flatMap((d) => parseJson<PageText[]>(d.extractedText, []));
  return {
    set,
    material: formatMaterial(sampled),
    flagged: flaggedNotes.map((n) => `(p.${n.page}) ${n.passage}`).join("\n"),
    missed,
    pages,
    docs: set.documents,
  };
}

async function generateForStudySet(studySetId: string, target: "quiz" | "games" | "all") {
  const doQuiz = target === "quiz" || target === "all";
  const doGames = target === "games" || target === "all";
  if (doQuiz) {
    await prisma.studySet.update({
      where: { id: studySetId },
      data: { quizStatus: "generating", quizError: null },
    });
  }
  if (doGames) {
    await prisma.studySet.update({
      where: { id: studySetId },
      data: { gamesStatus: "generating", gamesError: null },
    });
  }
  try {
    const ctx = await loadContext(studySetId);
    if (doQuiz) await generateQuiz(ctx);
    if (doGames) {
      await Promise.all([
        generateMinigame(ctx, "match_pairs"),
        generateMinigame(ctx, "fill_blank"),
        generateMinigame(ctx, "true_false"),
        generateMinigame(ctx, "sequence_sort"),
      ]);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("generation", studySetId, err);
    if (doQuiz) {
      await prisma.studySet.update({
        where: { id: studySetId },
        data: { quizStatus: "failed", quizError: message },
      });
    }
    if (doGames) {
      await prisma.studySet.update({
        where: { id: studySetId },
        data: { gamesStatus: "failed", gamesError: message },
      });
    }
  }
}

type Ctx = Awaited<ReturnType<typeof loadContext>>;

async function generateQuiz(ctx: Ctx) {
  let parsed;
  try {
    if (llmEnabled()) {
      const p = quizPrompt(ctx.material, ctx.flagged, ctx.missed);
      parsed = await chatJson(p.system, p.user, quizSchema);
    } else {
      parsed = fallbackQuiz(ctx.pages, ctx.flagged ? ctx.flagged.split("\n") : [], ctx.missed);
    }
  } catch (err) {
    console.warn("quiz llm failed, using fallback", err);
    parsed = fallbackQuiz(ctx.pages, ctx.flagged ? ctx.flagged.split("\n") : [], ctx.missed);
  }
  await prisma.quizQuestion.deleteMany({ where: { studySetId: ctx.set.id } });
  for (const q of parsed.questions.slice(0, 10)) {
    const doc = ctx.docs.find((d) => d.originalName === q.sourceDocumentName) ?? ctx.docs[0];
    await prisma.quizQuestion.create({
      data: {
        studySetId: ctx.set.id,
        question: q.question,
        options: toJson(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        difficulty: q.difficulty,
        sourceDocumentId: doc?.id ?? null,
        sourcePage: q.sourcePage ?? null,
        concept: q.concept ?? null,
      },
    });
  }
  await prisma.studySet.update({
    where: { id: ctx.set.id },
    data: { quizStatus: "ready", quizError: null },
  });
}

async function generateMinigame(ctx: Ctx, type: MinigameType) {
  let content: unknown;
  try {
    if (llmEnabled()) {
      if (type === "match_pairs") {
        const p = matchPairsPrompt(ctx.material, ctx.missed);
        content = await chatJson(p.system, p.user, matchPairsSchema);
      } else if (type === "fill_blank") {
        const p = fillBlankPrompt(ctx.material, ctx.missed);
        content = await chatJson(p.system, p.user, fillBlankSchema);
      } else if (type === "true_false") {
        const p = trueFalsePrompt(ctx.material, ctx.missed);
        content = await chatJson(p.system, p.user, trueFalseSchema);
      } else {
        const p = sequencePrompt(ctx.material, ctx.missed);
        content = await chatJson(p.system, p.user, sequenceSchema);
      }
    } else {
      content = fallbackContent(ctx, type);
    }
  } catch (err) {
    console.warn("minigame llm failed", type, err);
    content = fallbackContent(ctx, type);
  }
  await prisma.minigameContent.upsert({
    where: { studySetId_type: { studySetId: ctx.set.id, type } },
    update: { content: toJson(content), generatedAt: new Date() },
    create: { studySetId: ctx.set.id, type, content: toJson(content) },
  });
  const remaining = await prisma.minigameContent.count({ where: { studySetId: ctx.set.id } });
  if (remaining >= 4) {
    await prisma.studySet.update({
      where: { id: ctx.set.id },
      data: { gamesStatus: "ready", gamesError: null },
    });
  }
}

function fallbackContent(ctx: Ctx, type: MinigameType) {
  if (type === "match_pairs") return fallbackMatchPairs(ctx.pages, ctx.missed);
  if (type === "fill_blank") return fallbackFillBlank(ctx.pages, ctx.missed);
  if (type === "true_false") return fallbackTrueFalse(ctx.pages, ctx.missed);
  return fallbackSequence(ctx.pages, ctx.missed);
}
