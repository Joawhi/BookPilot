import { describe, expect, it } from "vitest";
import { fallbackQuiz } from "./fallback.ts";

const pages = [
  {
    page: 1,
    text: "Bayesian inference updates a prior probability distribution using a likelihood function derived from observed data. A conjugate prior makes the posterior analytically tractable.",
  },
  {
    page: 2,
    text: "When conjugacy fails, Markov chain Monte Carlo approximates the posterior by drawing dependent samples. Bayes factors compare two models by the ratio of evidences.",
  },
];

describe("fallbackQuiz", () => {
  it("builds cloze questions from the source sentences", () => {
    const quiz = fallbackQuiz(pages, [], []);
    expect(quiz.questions.length).toBeGreaterThanOrEqual(4);
    expect(quiz.questions.some((q) => q.question.includes("___"))).toBe(true);
    expect(quiz.questions.some((q) => /what should you review next/i.test(q.question))).toBe(false);
    const blob = JSON.stringify(quiz).toLowerCase();
    expect(blob).toMatch(/posterior|likelihood|bayes|conjugate|prior/);
  });

  it("skips copyright headers and broken wrap fragments", () => {
    const quiz = fallbackQuiz(
      [
        { page: 1, text: "Python for Software Design Copyright (c) Martin L. All rights reserved." },
        { page: 2, text: "The type is inferred from the way the variable is used d." },
        {
          page: 3,
          text: "Dynamic typing means the type is inferred from the way the variable is used in later expressions. Python functions can return different types depending on the arguments they receive.",
        },
      ],
      [],
      [],
    );
    const blob = JSON.stringify(quiz);
    expect(blob).not.toMatch(/Copyright/);
    expect(blob).not.toMatch(/used d/);
    expect(blob.toLowerCase()).toMatch(/dynamic|inferred|python functions/);
  });
});
