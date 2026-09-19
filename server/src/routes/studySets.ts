import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db.ts";
import { toJson } from "../db/json.ts";
import { toSetDetail, toSetSummary } from "../db/map.ts";
import { config } from "../config.ts";
import { asyncHandler, HttpError } from "../middleware/error.ts";
import type { AuthedRequest } from "../middleware/auth.ts";
import { extractPdfText } from "../services/pdfExtract.ts";
import { enqueueGeneration } from "../services/generation.ts";
import { MAX_PDFS_PER_UPLOAD, MAX_PDF_BYTES } from "../../../shared/constants.ts";

export const studySetsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: MAX_PDFS_PER_UPLOAD },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    cb(ok ? null : new HttpError(400, "Only PDF files are accepted.", "not_pdf"), ok);
  },
});

async function ownedSet(userId: string, id: string) {
  const row = await prisma.studySet.findFirst({
    where: { id, userId },
    include: {
      documents: { orderBy: { createdAt: "asc" } },
      _count: { select: { documents: true, notes: true } },
    },
  });
  if (!row) throw new HttpError(404, "Study set not found.", "not_found");
  return row;
}

studySetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const rows = await prisma.studySet.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { documents: true, notes: true } } },
    });
    res.json(rows.map(toSetSummary));
  }),
);

studySetsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const row = await ownedSet(user.id, req.params.id);
    res.json(toSetDetail(row));
  }),
);

studySetsRouter.post(
  "/",
  upload.array("files", MAX_PDFS_PER_UPLOAD),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new HttpError(400, "Drop one or more PDFs to start learning.", "no_files");
    }
    if (files.length > MAX_PDFS_PER_UPLOAD) {
      throw new HttpError(400, "Up to 5 PDFs per upload.", "too_many_files");
    }

    const extracted = [];
    for (const file of files) {
      try {
        const result = await extractPdfText(file.buffer);
        extracted.push({ file, ...result });
      } catch (err) {
        console.error("pdf extract", err);
        throw new HttpError(
          400,
          `Could not read “${file.originalname}”. Try another PDF.`,
          "pdf_unreadable",
        );
      }
    }

    const readable = extracted.filter((e) => e.hasExtractableText);
    if (readable.length === 0) {
      throw new HttpError(
        400,
        extracted[0]?.scanWarning ||
          "These look like scanned PDFs without extractable text. BookPilot needs a text layer — try an OCR'd or born-digital PDF.",
        "scanned_pdf",
      );
    }

    const title =
      readable[0]!.file.originalname.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() ||
      "Untitled study set";

    const set = await prisma.studySet.create({
      data: {
        userId: user.id,
        title,
        quizStatus: "pending",
        gamesStatus: "pending",
      },
    });

    const userDir = path.join(config.uploadDir, user.id);
    fs.mkdirSync(userDir, { recursive: true });

    for (const item of extracted) {
      const doc = await prisma.document.create({
        data: {
          studySetId: set.id,
          originalName: item.file.originalname,
          storedName: "",
          storagePath: "",
          mimeType: "application/pdf",
          pageCount: item.pageCount,
          extractedText: toJson(item.pages),
          hasExtractableText: item.hasExtractableText,
          scanWarning: item.scanWarning,
        },
      });
      const storagePath = path.join(userDir, `${doc.id}.pdf`);
      fs.writeFileSync(storagePath, item.file.buffer);
      await prisma.document.update({
        where: { id: doc.id },
        data: { storedName: `${doc.id}.pdf`, storagePath },
      });
    }

    enqueueGeneration(set.id, "all").catch((err) => console.error(err));

    const detail = await ownedSet(user.id, set.id);
    res.status(201).json(toSetDetail(detail));
  }),
);

studySetsRouter.post(
  "/:id/regenerate",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z.object({ target: z.enum(["quiz", "games", "all"]).default("all") }).parse(req.body ?? {});
    const set = await ownedSet(user.id, req.params.id);
    enqueueGeneration(set.id, body.target).catch((err) => console.error(err));
    const detail = await ownedSet(user.id, set.id);
    res.json(toSetDetail(detail));
  }),
);

studySetsRouter.patch(
  "/:id/progress",
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = z.object({ documentId: z.string(), page: z.number().int().min(1) }).parse(req.body);
    const set = await ownedSet(user.id, req.params.id);
    const doc = set.documents.find((d) => d.id === body.documentId);
    if (!doc) throw new HttpError(404, "Document not in this set.", "not_found");
    await prisma.studySet.update({
      where: { id: set.id },
      data: { lastReadDocumentId: body.documentId, lastReadPage: body.page },
    });
    res.json({ ok: true });
  }),
);
