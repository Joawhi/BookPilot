import { describe, expect, it } from "vitest";
import { itemsToPlainText, unwrapPdfLines } from "./pdfText.ts";

describe("itemsToPlainText", () => {
  it("joins per-glyph items into words without extra spaces", () => {
    const text = itemsToPlainText([
      { str: "B", transform: [10, 0, 0, 10, 0, 100], width: 7 },
      { str: "a", transform: [10, 0, 0, 10, 7, 100], width: 6 },
      { str: "y", transform: [10, 0, 0, 10, 13, 100], width: 6 },
      { str: "e", transform: [10, 0, 0, 10, 19, 100], width: 6 },
      { str: "s", transform: [10, 0, 0, 10, 25, 100], width: 6 },
    ]);
    expect(text).toBe("Bayes");
  });

  it("inserts a space between separate words", () => {
    const text = itemsToPlainText([
      { str: "Bayesian", transform: [12, 0, 0, 12, 0, 80], width: 54 },
      { str: "inference", transform: [12, 0, 0, 12, 62, 80], width: 58 },
    ]);
    expect(text).toBe("Bayesian inference");
  });

  it("starts a new line when the y position jumps", () => {
    const text = itemsToPlainText([
      { str: "Prior", transform: [10, 0, 0, 10, 0, 200], width: 30 },
      { str: "Posterior", transform: [10, 0, 0, 10, 0, 180], width: 50 },
    ]);
    expect(text).toBe("Prior\nPosterior");
  });

  it("unwraps wrapped PDF lines into full sentences", () => {
    const text = unwrapPdfLines(
      "Bayesian inference updates a prior probability distribution\nusing a likelihood function derived from observed data.\nA conjugate prior makes the posterior analytically tractable.",
    );
    expect(text).toContain(
      "Bayesian inference updates a prior probability distribution using a likelihood function derived from observed data.",
    );
    expect(text).toContain("A conjugate prior makes the posterior analytically tractable.");
  });
});
