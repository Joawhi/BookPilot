export type PdfGlyph = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

function fontSizeOf(item: PdfGlyph, fallback: number) {
  const t = item.transform;
  if (t && t.length >= 4) {
    const size = Math.hypot(t[2] ?? 0, t[3] ?? 0);
    if (size > 0) return size;
  }
  return item.height && item.height > 0 ? item.height : fallback;
}

/** Rebuild page text from pdf.js items without injecting a space between every glyph. */
export function itemsToPlainText(items: PdfGlyph[]): string {
  const lines: string[] = [];
  let current = "";
  let lastY: number | null = null;
  let lastEndX: number | null = null;
  let lastSize = 12;

  for (const item of items) {
    const str = typeof item.str === "string" ? item.str : "";
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    const size = fontSizeOf(item, lastSize);
    const newLine =
      lastY !== null && y !== undefined && Math.abs(y - lastY) > Math.max(size, lastSize) * 0.35;

    if (newLine && current.trim()) {
      lines.push(current.replace(/[ \t]+$/g, ""));
      current = "";
      lastEndX = null;
    }

    if (str) {
      if (!current) {
        current = str;
      } else {
        const alreadySpaced = /\s$/.test(current) || /^\s/.test(str);
        let gap = 0;
        if (x !== undefined && lastEndX !== null) gap = x - lastEndX;
        const needSpace = !alreadySpaced && (lastEndX === null || gap > size * 0.12);
        current += (needSpace ? " " : "") + str;
      }
    }

    if (x !== undefined) {
      lastEndX = x + (item.width ?? str.length * size * 0.5);
    }
    if (y !== undefined) lastY = y;
    lastSize = size;

    if (item.hasEOL) {
      if (current.trim()) lines.push(current.replace(/[ \t]+$/g, ""));
      current = "";
      lastEndX = null;
      lastY = null;
    }
  }

  if (current.trim()) lines.push(current.replace(/[ \t]+$/g, ""));

  return unwrapPdfLines(
    lines
      .join("\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

/** Join wrapped PDF lines so sentence splitters see real sentences, not line fragments. */
export function unwrapPdfLines(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(line);
      continue;
    }
    if (/[A-Za-z0-9]-$/.test(prev)) {
      out[out.length - 1] = prev.slice(0, -1) + line;
      continue;
    }
    const prevEndsSentence = /[.!?:;]$/.test(prev);
    const continues = /^[a-z0-9([{]/.test(line);
    if (!prevEndsSentence && continues) {
      out[out.length - 1] = `${prev} ${line}`;
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}
