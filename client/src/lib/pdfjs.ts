import "./pdfjsPolyfills";
import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export { pdfjs };

/** Safari cannot `for await` a ReadableStream; read chunks with getReader instead. */
export async function getPageTextContent(page: pdfjs.PDFPageProxy) {
  try {
    return await page.getTextContent();
  } catch {
    const reader = page.streamTextContent().getReader();
    const items: Awaited<ReturnType<pdfjs.PDFPageProxy["getTextContent"]>>["items"] = [];
    const styles: Record<string, unknown> = {};
    let lang: string | null = null;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.lang) lang = value.lang;
        Object.assign(styles, value.styles);
        if (value.items) items.push(...value.items);
      }
    } finally {
      reader.releaseLock();
    }
    return { items, styles, lang } as Awaited<ReturnType<pdfjs.PDFPageProxy["getTextContent"]>>;
  }
}
