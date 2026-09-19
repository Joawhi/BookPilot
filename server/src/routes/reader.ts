import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.ts";
import { parseJson, toJson } from "../db/json.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { chatJson, llmEnabled } from "../llm/index.ts";
import { fallbackExplain, fallbackQueries, fallbackRecap } from "../llm/fallback.ts";
import { explainPrompt, explainSchema, queriesPrompt, querySchema, recapPrompt, recapSchema } from "../llm/prompts.ts";
import { searchRealPapers } from "../services/references.ts";
import type { PageText, ReferencePaper, SessionRecap } from "../../../shared/types.ts";

export const readerRouter = Router();

const passageBody = z.object({
  documentId: z.string(),
  page: z.number().int().min(1),
  passage: z.string().min(1).max(8000),
  context: z.string().max(8000).optional(),
});

async function ownedDoc(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, studySet: { userId } },
  });
  if (!doc) throw new HttpError(404, "Document not found.", "not_found");
  return doc;
}

function surrounding(doc: { extractedText: string }, page: number, passage: string) {
  const pages = parseJson<PageText[]>(doc.extractedText, []);
  const nearby = pages
    .filter((p) => Math.abs(p.page - page) <= 1)
    .map((p) => p.text)
    .join("\n");
  return nearby.includes(passage) ? nearby : `${passage}\n\n${nearby}`;
}

readerRouter.post(
  "/explain",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = passageBody.parse(req.body);
    const doc = await ownedDoc(user.id, body.documentId);
    const context = body.context || surrounding(doc, body.page, body.passage);
    let result;
    try {
      if (llmEnabled()) {
        const p = explainPrompt(body.passage, context);
        result = await chatJson(p.system, p.user, explainSchema);
      } else {
        result = fallbackExplain(body.passage);
      }
    } catch (err) {
      console.warn("explain fallback", err);
      result = fallbackExplain(body.passage);
    }
    res.json(result);
  }),
);

readerRouter.post(
  "/references",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = passageBody.parse(req.body);
    const doc = await ownedDoc(user.id, body.documentId);
    const context = body.context || surrounding(doc, body.page, body.passage);
    let queries: string[] = [];
    let concepts: string[] = [];
    try {
      if (llmEnabled()) {
        const p = queriesPrompt(body.passage, context);
        const parsed = await chatJson(p.system, p.user, querySchema);
        queries = parsed.queries;
        concepts = parsed.concepts;
      } else {
        const parsed = fallbackQueries(body.passage);
        queries = parsed.queries;
        concepts = parsed.concepts;
      }
    } catch {
      const parsed = fallbackQueries(body.passage);
      queries = parsed.queries;
      concepts = parsed.concepts;
    }
    const papers = await searchRealPapers(queries);
    res.json({ queries, concepts, papers });
  }),
);

readerRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z.object({ studySetId: z.string(), documentId: z.string().optional() }).parse(req.body);
    const set = await prisma.studySet.findFirst({ where: { id: body.studySetId, userId: user.id } });
    if (!set) throw new HttpError(404, "Study set not found.", "not_found");
    const session = await prisma.readingSession.create({
      data: { studySetId: set.id, documentId: body.documentId ?? null },
    });
    res.status(201).json({ id: session.id });
  }),
);

readerRouter.post(
  "/sessions/:id/end",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const session = await prisma.readingSession.findFirst({
      where: { id: req.params.id, studySet: { userId: user.id } },
    });
    if (!session) throw new HttpError(404, "Session not found.", "not_found");
    const notes = await prisma.note.findMany({
      where: { studySetId: session.studySetId, createdAt: { gte: session.startedAt } },
    });
    const papers = notes.flatMap((n) => parseJson<ReferencePaper[]>(n.references, []));
    const unique = papers.filter((p, i, arr) => arr.findIndex((x) => x.url === p.url) === i);
    const notesText = notes
      .map((n) => `${n.flagged ? "[flagged] " : ""}p.${n.page}: ${n.passage}${n.explanation ? `\nExplain: ${n.explanation}` : ""}`)
      .join("\n\n");
    const papersText = unique.map((p) => `${p.title} (${p.year ?? "?"}) ${p.url}`).join("\n");
    let recap: string;
    try {
      if (llmEnabled()) {
        const p = recapPrompt(notesText, papersText);
        recap = (await chatJson(p.system, p.user, recapSchema)).recap;
      } else {
        recap = fallbackRecap(notesText, papersText).recap;
      }
    } catch {
      recap = fallbackRecap(notesText, papersText).recap;
    }
    const updated = await prisma.readingSession.update({
      where: { id: session.id },
      data: { recap, references: toJson(unique), endedAt: new Date() },
    });
    const payload: SessionRecap = {
      id: updated.id,
      recap: updated.recap ?? recap,
      references: unique,
      endedAt: updated.endedAt!.toISOString(),
    };
    res.json(payload);
  }),
);
