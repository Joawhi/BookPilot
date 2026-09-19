import type {
  DocumentSummary,
  FeatureStatus,
  NoteRecord,
  ReferencePaper,
  StudySetDetail,
  StudySetSummary,
} from "../../../shared/types.ts";
import { parseJson } from "./json.ts";

type SetRow = {
  id: string;
  title: string;
  createdAt: Date;
  bestScore: number;
  totalPoints: number;
  quizStatus: string;
  gamesStatus: string;
  lastReadDocumentId: string | null;
  lastReadPage: number;
  quizError?: string | null;
  gamesError?: string | null;
  documents?: { id: string }[];
  notes?: { id: string }[];
  _count?: { documents: number; notes: number };
};

export function asStatus(value: string): FeatureStatus {
  if (value === "generating" || value === "ready" || value === "failed" || value === "pending") {
    return value;
  }
  return "pending";
}

export function toSetSummary(row: SetRow): StudySetSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    documentCount: row._count?.documents ?? row.documents?.length ?? 0,
    noteCount: row._count?.notes ?? row.notes?.length ?? 0,
    bestScore: row.bestScore,
    totalPoints: row.totalPoints,
    quizStatus: asStatus(row.quizStatus),
    gamesStatus: asStatus(row.gamesStatus),
    lastReadDocumentId: row.lastReadDocumentId,
    lastReadPage: row.lastReadPage,
  };
}

export function toSetDetail(
  row: SetRow & {
    documents: {
      id: string;
      originalName: string;
      pageCount: number;
      hasExtractableText: boolean;
      scanWarning: string | null;
    }[];
  },
): StudySetDetail {
  return {
    ...toSetSummary(row),
    quizError: row.quizError ?? null,
    gamesError: row.gamesError ?? null,
    documents: row.documents.map(toDocumentSummary),
  };
}

export function toDocumentSummary(row: {
  id: string;
  originalName: string;
  pageCount: number;
  hasExtractableText: boolean;
  scanWarning: string | null;
}): DocumentSummary {
  return {
    id: row.id,
    originalName: row.originalName,
    pageCount: row.pageCount,
    hasExtractableText: row.hasExtractableText,
    scanWarning: row.scanWarning,
  };
}

export function toNoteRecord(row: {
  id: string;
  studySetId: string;
  documentId: string;
  passage: string;
  page: number;
  explanation: string | null;
  references: string;
  flagged: boolean;
  comment: string | null;
  createdAt: Date;
  document?: { originalName: string };
}): NoteRecord {
  return {
    id: row.id,
    studySetId: row.studySetId,
    documentId: row.documentId,
    documentName: row.document?.originalName ?? "Document",
    passage: row.passage,
    page: row.page,
    explanation: row.explanation,
    references: parseJson<ReferencePaper[]>(row.references, []),
    flagged: row.flagged,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}
