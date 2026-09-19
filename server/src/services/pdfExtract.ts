import { createRequire } from "node:module";
import type { PageText } from "../../../shared/types.ts";

const require = createRequire(import.meta.url);

const MIN_CHARS_PER_PAGE = 40;
const MIN_TOTAL_CHARS = 200;

type Pdfjs = {
  getDocument: (src: { data: Uint8Array; useSystemFonts?: boolean }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
      }>;
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

export async function extractPdfText(buffer: Buffer): Promise<{
  pages: PageText[];
  pageCount: number;
  hasExtractableText: boolean;
  scanWarning: string | null;
}> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
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
