import { describe, expect, it } from "vitest";
import { chunkPages, sampleDense } from "./denseSample.ts";

describe("denseSample", () => {
  it("scores information-dense pages above repeated filler", () => {
    const dense =
      "Bayesian inference updates a prior distribution using likelihood from observed data yielding a posterior over parameters.";
    const filler = Array.from({ length: 40 }, () => "the the the the").join(" ");
    const chunks = chunkPages("d1", "paper.pdf", [
      { page: 1, text: filler },
      { page: 2, text: dense },
    ]);
    const sampled = sampleDense(chunks, new Set(), 1);
    expect(sampled[0]?.page).toBe(2);
  });

  it("always keeps flagged pages", () => {
    const chunks = chunkPages("d1", "paper.pdf", [
      { page: 1, text: "alpha beta gamma delta epsilon zeta eta theta" },
      { page: 9, text: "tiny flagged sentence about mitochondria energy production in eukaryotic cells across several tissues" },
    ]);
    const sampled = sampleDense(chunks, new Set(["d1:9"]), 1);
    expect(sampled.some((c) => c.page === 9)).toBe(true);
  });
});
