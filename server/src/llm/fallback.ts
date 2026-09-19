import type { PageText } from "../../../shared/types.ts";
import {
  explainSchema,
  fillBlankSchema,
  matchPairsSchema,
  quizSchema,
  querySchema,
  recapSchema,
  sequenceSchema,
  trueFalseSchema,
} from "./prompts.ts";

const STOP = new Set(
  "the a an of to and in on for with from by as is are was were be this that these those it its or at not into about than then also such using used can may between over under more most other into through".split(
    " ",
  ),
);

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 4 && !STOP.has(t));
}

function topTerms(text: string, n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of tokens(text)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

function allText(pages: PageText[]) {
  return pages.map((p) => p.text).join("\n");
}

export function fallbackExplain(passage: string) {
  const bits = sentences(passage).slice(0, 3);
  const explanation =
    bits.join(" ") ||
    `This passage discusses ${topTerms(passage, 4).join(", ") || "the selected topic"}. Read the surrounding paragraphs for full context.`;
  return explainSchema.parse({
    explanation: explanation.slice(0, 500),
    concepts: topTerms(passage, 4),
  });
}

export function fallbackQueries(passage: string) {
  const terms = topTerms(passage, 8);
  const queries = [
    terms.slice(0, 3).join(" "),
    terms.slice(2, 6).join(" "),
    `${terms[0] ?? "academic"} review`,
  ].filter((q) => q.trim().length > 3);
  return querySchema.parse({ queries: queries.slice(0, 3), concepts: terms.slice(0, 5) });
}

export function fallbackRecap(notes: string, papers: string) {
  return recapSchema.parse({
    recap: `Key points from this session:\n${notes.slice(0, 1200) || "No notes were saved."}\n\nReferences collected:\n${papers.slice(0, 1200) || "None yet."}`,
  });
}

export function fallbackQuiz(
  pages: PageText[],
  flagged: string[],
  missed: string[],
) {
  const pool = [
    ...flagged,
    ...pages.map((p) => p.text),
  ].flatMap((t) => sentences(t));
  const questions = [];
  const used = new Set<number>();
  let i = 0;
  while (questions.length < 10 && i < pool.length + 20) {
    const idx = i % Math.max(pool.length, 1);
    i += 1;
    if (used.has(idx) || !pool[idx]) continue;
    used.add(idx);
    const sentence = pool[idx];
    const terms = topTerms(sentence, 6);
    const answer = missed[questions.length % Math.max(missed.length, 1)] || terms[0];
    if (!answer) continue;
    const distractors = topTerms(allText(pages), 12).filter((t) => t !== answer);
    const options = [answer, ...distractors.slice(0, 3)];
    while (options.length < 4) options.push(`none of these (${options.length})`);
    const shuffled = options.slice(0, 4);
    const correctIndex = 0;
    const page = pages.find((p) => p.text.includes(sentence.slice(0, 40)))?.page ?? null;
    questions.push({
      question: `Which concept is most central to: “${sentence.slice(0, 160)}”?`,
      options: shuffled,
      correctIndex,
      explanation: `The passage focuses on “${answer}”. ${sentence.slice(0, 180)}`,
      difficulty: questions.length < 3 ? "easy" : questions.length < 7 ? "medium" : "hard",
      sourcePage: page,
      concept: answer,
    });
  }
  while (questions.length < 10) {
    const concept = missed[questions.length] || topTerms(allText(pages), 10)[questions.length] || "the main argument";
    questions.push({
      question: `True understanding check: what should you review next?`,
      options: [concept, "unrelated trivia", "page numbers", "the bibliography only"],
      correctIndex: 0,
      explanation: `Review “${concept}” — it appears often in this set.`,
      difficulty: "easy",
      sourcePage: pages[0]?.page ?? 1,
      concept,
    });
  }
  return quizSchema.parse({ questions: questions.slice(0, 10) });
}

export function fallbackMatchPairs(pages: PageText[], missed: string[]) {
  const terms = [...missed, ...topTerms(allText(pages), 12)].slice(0, 8);
  const pairs = terms.map((term) => {
    const page = pages.find((p) => p.text.toLowerCase().includes(term.toLowerCase()));
    const snippet = page ? sentences(page.text).find((s) => s.toLowerCase().includes(term)) : undefined;
    return {
      term,
      definition: snippet ? snippet.slice(0, 110) : `A key idea in this reading related to ${term}.`,
    };
  });
  return matchPairsSchema.parse({ pairs });
}

export function fallbackFillBlank(pages: PageText[], missed: string[]) {
  const sents = pages.flatMap((p) =>
    sentences(p.text).map((s) => ({ s, page: p.page })),
  );
  const items = [];
  for (const { s, page } of sents) {
    if (items.length >= 8) break;
    const terms = topTerms(s, 3);
    const answer = missed.find((m) => s.toLowerCase().includes(m.toLowerCase())) || terms[0];
    if (!answer || !s.toLowerCase().includes(answer.toLowerCase())) continue;
    const re = new RegExp(answer, "i");
    const sentence = s.replace(re, "___");
    const bank = Array.from(new Set([answer, ...topTerms(allText(pages), 8).filter((t) => t !== answer)])).slice(0, 5);
    items.push({ sentence, answer, bank, sourcePage: page, concept: answer });
  }
  while (items.length < 8) {
    const answer = missed[items.length] || topTerms(allText(pages), 8)[items.length] || "concept";
    items.push({
      sentence: `In this reading, ___ is a central idea you should be able to explain.`,
      answer,
      bank: [answer, "appendix", "footnote", "margin"],
      sourcePage: 1,
      concept: answer,
    });
  }
  return fillBlankSchema.parse({ items: items.slice(0, 8) });
}

export function fallbackTrueFalse(pages: PageText[], missed: string[]) {
  const sents = pages.flatMap((p) => sentences(p.text).map((s) => ({ s, page: p.page }))).slice(0, 12);
  const statements = sents.map((row, i) => {
    const isTrue = i % 2 === 0;
    const text = isTrue
      ? row.s
      : row.s.replace(/\b(is|are|was|were|can|must)\b/i, "cannot");
    return {
      text: text.slice(0, 220),
      isTrue,
      explanation: isTrue ? "This follows the source text." : "This twists a claim from the source — check the original sentence.",
      sourcePage: row.page,
      concept: missed[i % Math.max(missed.length, 1)] || topTerms(row.s, 1)[0] || "claim",
    };
  });
  while (statements.length < 12) {
    statements.push({
      text: `The authors never mention ${missed[0] || "the main topic"}.`,
      isTrue: false,
      explanation: "That topic is present in the uploaded material.",
      sourcePage: 1,
      concept: missed[0] || "topic",
    });
  }
  return trueFalseSchema.parse({ statements: statements.slice(0, 12) });
}

export function fallbackSequence(pages: PageText[], missed: string[]) {
  const sents = sentences(allText(pages)).slice(0, 18);
  const puzzles = [0, 1, 2].map((n) => {
    const slice = sents.slice(n * 5, n * 5 + 5);
    const items = (slice.length >= 4 ? slice : sents.slice(0, 4)).slice(0, 5).map((text, i) => ({
      id: String.fromCharCode(97 + i),
      text: text.slice(0, 140),
    }));
    return {
      title: missed[n] ? `How “${missed[n]}” unfolds` : `Sequence ${n + 1} from the reading`,
      items,
      correctOrder: items.map((it) => it.id),
      concept: missed[n] || topTerms(items.map((i) => i.text).join(" "), 1)[0] || "process",
    };
  });
  return sequenceSchema.parse({ puzzles });
}
