/**
 * Writes a small born-digital PDF with extractable text for local testing.
 * Usage: node scripts/make-sample-pdf.mjs
 */
import fs from "node:fs";
import path from "node:path";

function pdfEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePage(lines, width = 612, height = 792) {
  const startY = 720;
  const ops = ["BT", "/F1 12 Tf"];
  lines.forEach((line, i) => {
    if (i === 0) ops.push(`72 ${startY} Td (${pdfEscape(line)}) Tj`);
    else ops.push(`0 -18 Td (${pdfEscape(line)}) Tj`);
  });
  ops.push("ET");
  const stream = ops.join("\n");
  return { stream, width, height };
}

const pages = [
  makePage([
    "BookPilot Sample: Bayesian Inference",
    "Bayesian inference updates a prior probability distribution",
    "using a likelihood function derived from observed data.",
    "The result is a posterior over parameters, which can be used",
    "for prediction, model comparison, and experimental design.",
    "A conjugate prior makes the posterior analytically tractable.",
    "When conjugacy fails, Markov chain Monte Carlo (MCMC)",
    "approximates the posterior by drawing dependent samples.",
  ]),
  makePage([
    "Evidence and Model Comparison",
    "The marginal likelihood, also called the evidence, is the",
    "integral of likelihood times prior over parameter space.",
    "Bayes factors compare two models by the ratio of evidences.",
    "Overfitting is penalized because broad priors spread mass",
    "thinly, lowering the evidence of overly flexible models.",
    "Information criteria such as WAIC approximate this penalty",
    "from posterior samples without computing the integral.",
  ]),
  makePage([
    "Practical Workflow",
    "1. Specify a generative model and a prior.",
    "2. Collect data and write the likelihood.",
    "3. Compute or sample the posterior.",
    "4. Check posterior predictive simulations.",
    "5. Compare models and refine the story.",
    "Confusing point: a p-value is not a posterior probability",
    "that the null hypothesis is true. They answer different questions.",
  ]),
];

const objects = [];
objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
objects.push(`2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pages.length} >> endobj`);
const fontId = 3 + pages.length * 2;
pages.forEach((p, i) => {
  const pageId = 3 + i * 2;
  const contentId = pageId + 1;
  objects.push(
    `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >> endobj`,
  );
  objects.push(`${contentId} 0 obj << /Length ${p.stream.length} >> stream\n${p.stream}\nendstream endobj`);
});
objects.push(`${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> endobj`);

let body = "%PDF-1.4\n";
const offsets = [0];
for (const obj of objects) {
  offsets.push(body.length);
  body += obj + "\n";
}
const xrefPos = body.length;
let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) {
  xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
body += xref;
body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

const out = path.resolve("data/sample-bayes.pdf");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, body);
console.log("Wrote", out);
