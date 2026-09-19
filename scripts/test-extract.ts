import fs from "node:fs";
import { extractPdfText } from "../server/src/services/pdfExtract.ts";

const buf = fs.readFileSync("data/sample-bayes.pdf");
const r = await extractPdfText(buf);
console.log(
  JSON.stringify(
    {
      pageCount: r.pageCount,
      hasText: r.hasExtractableText,
      warning: r.scanWarning,
      sample: r.pages[0]?.text.slice(0, 160),
    },
    null,
    2,
  ),
);
