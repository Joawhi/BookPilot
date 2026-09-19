import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  url: string;
  page: number;
  scale: number;
  onPageCount: (n: number) => void;
  onSelect: (payload: { text: string; x: number; y: number } | null) => void;
}

export function PdfPane({ url, page, scale, onPageCount, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    const task = pdfjs.getDocument({ url, withCredentials: true });
    task.promise
      .then((d) => {
        if (cancelled) return;
        setDoc(d);
        onPageCount(d.numPages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open PDF");
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url, onPageCount]);

  useEffect(() => {
    if (!doc) return;
    const canvas = canvasRef.current;
    const textLayer = textRef.current;
    if (!canvas || !textLayer) return;
    let cancelled = false;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (cancelled) return;
      const viewport = pdfPage.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;
      textLayer.innerHTML = "";
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
      await pdfPage.render({ canvasContext: ctx, viewport, canvas, transform }).promise;
      const textContent = await pdfPage.getTextContent();
      const layer = new pdfjs.TextLayer({
        textContentSource: textContent,
        viewport,
        container: textLayer,
      });
      await layer.render();
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Render failed");
    });
    return () => {
      cancelled = true;
    };
  }, [doc, page, scale]);

  useEffect(() => {
    function onUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!text || text.length < 8 || !wrapRef.current?.contains(sel?.anchorNode ?? null)) {
        onSelect(null);
        return;
      }
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const wrap = wrapRef.current.getBoundingClientRect();
      onSelect({
        text,
        x: rect.left - wrap.left + rect.width / 2,
        y: rect.top - wrap.top - 8,
      });
    }
    document.addEventListener("mouseup", onUp);
    return () => document.removeEventListener("mouseup", onUp);
  }, [onSelect]);

  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div ref={wrapRef} style={{ position: "relative", margin: "0 auto" }}>
      <canvas ref={canvasRef} style={{ display: "block", borderRadius: 8 }} />
      <div ref={textRef} className="textLayer" />
    </div>
  );
}
