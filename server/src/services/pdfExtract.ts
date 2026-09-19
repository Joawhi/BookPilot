import { createRequire } from "node:module";
import type { PageText } from "../../../shared/types.ts";
import { itemsToPlainText, type PdfGlyph } from "./pdfText.ts";

const require = createRequire(import.meta.url);

const MIN_CHARS_PER_PAGE = 40;
const MIN_TOTAL_CHARS = 200;

type PdfjsPage = {
  getTextContent: () => Promise<{ items: PdfGlyph[] }>;
  streamTextContent: () => ReadableStream<{ items?: PdfGlyph[] }>;
};

type Pdfjs = {
  getDocument: (src: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    disableFontFace?: boolean;
    isEvalSupported?: boolean;
  }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<PdfjsPage>;
    }>;
  };
  GlobalWorkerOptions: { workerSrc: string };
};

let cached: Pdfjs | null = null;

async function loadPdfjs(): Promise<Pdfjs> {
  if (cached) return cached;
  const mod = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as Pdfjs;
  try {
    const worker = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    mod.GlobalWorkerOptions.workerSrc = worker;
  } catch {
    mod.GlobalWorkerOptions.workerSrc = "";
  }
  cached = mod;
  return mod;
}

async function readPageItems(page: PdfjsPage): Promise<PdfGlyph[]> {
  try {
    const content = await page.getTextContent();
    return content.items;
  } catch {
    const reader = page.streamTextContent().getReader();
    const items: PdfGlyph[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.items) items.push(...value.items);
      }
    } finally {
      reader.releaseLock();
    }
    return items;
  }
}

export async function extractPdfText(buffer: Buffer): Promise<{
  pages: PageText[];
  pageCount: number;
  hasExtractableText: boolean;
  scanWarning: string | null;
}> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;
  const pages: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const items = await readPageItems(page);
    const text = itemsToPlainText(items);
    pages.push({ page: i, text });
  }
  const total = pages.reduce((n, p) => n + p.text.length, 0);
  const pagesWithText = pages.filter((p) => p.text.length >= MIN_CHARS_PER_PAGE).length;
  const hasExtractableText = total >= MIN_TOTAL_CHARS && pagesWithText > 0;
  return {
    pages,
    pageCount: doc.numPages,
    hasExtractableText,
    scanWarning: hasExtractableText
      ? null
      : "This looks like a scanned PDF without extractable text. BookPilot needs a text layer — try an OCR'd file or a born-digital PDF.",
  };
}
