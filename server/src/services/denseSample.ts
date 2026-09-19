import type { PageText } from "../../../shared/types.ts";

export interface TextChunk {
  documentId: string;
  documentName: string;
  page: number;
  text: string;
  score: number;
}

const CHUNK_SIZE = 1500;

function uniqueTokenRatio(text: string) {
  const tokens = text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length + Math.min(tokens.length / 80, 1);
}

export function chunkPages(
  documentId: string,
  documentName: string,
  pages: PageText[],
): TextChunk[] {
  const chunks: TextChunk[] = [];
  for (const page of pages) {
    const text = page.text.trim();
    if (text.length < 40) continue;
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      const slice = text.slice(i, i + CHUNK_SIZE);
      chunks.push({
        documentId,
        documentName,
        page: page.page,
        text: slice,
        score: uniqueTokenRatio(slice),
      });
    }
  }
  return chunks;
}

/** Keep the densest chunks, plus any pages the user flagged. */
export function sampleDense(
  chunks: TextChunk[],
  flaggedPages: Set<string>,
  limit = 12,
): TextChunk[] {
  const flagged = chunks.filter((c) => flaggedPages.has(`${c.documentId}:${c.page}`));
  const rest = chunks
    .filter((c) => !flaggedPages.has(`${c.documentId}:${c.page}`))
    .sort((a, b) => b.score - a.score);
  const picked: TextChunk[] = [];
  const seen = new Set<string>();
  for (const c of [...flagged, ...rest]) {
    const key = `${c.documentId}:${c.page}:${c.text.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(c);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function formatMaterial(chunks: TextChunk[]) {
  return chunks
    .map((c) => `[${c.documentName} p.${c.page}]\n${c.text}`)
    .join("\n\n");
}
