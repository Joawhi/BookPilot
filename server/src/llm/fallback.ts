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
  "the a an of to and in on for with from by as is are was were be this that these those it its or at not into about than then also such using used can may between over under more most other through".split(
    " ",
  ),
);

const WEAK = new Set(
  "result results using used based called makes which because without also such into from about these those their there other more most only even same just very after before during another example following given shown figure table section chapter page paper study sample confusing true false review next should could would might being been have has had does did done like than then when where what this that them they our your copyright reserved rights software design".split(
    " ",
  ),
);

function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((para) => para.split(/(?<=[.?!])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(isUsefulSentence);
}

const JUNK =
  /copyright|\(c\)|©|all rights reserved|isbn|printed in|table of contents|\bwww\.|https?:\/\/|\.com\b|\binc\.\b|\bltd\.\b|\bllc\b|\bpage\s+\d+/i;

export function isUsefulSentence(s: string): boolean {
  if (s.length < 60 || s.length > 320) return false;
  if (!/[a-z]/.test(s)) return false;
  if (JUNK.test(s)) return false;
  if (/\s[a-z]\.[”"]?$/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length < 10) return false;
  const letters = s.replace(/[^A-Za-z]/g, "");
  const caps = letters.replace(/[^A-Z]/g, "").length;
  if (letters.length > 0 && caps / letters.length > 0.45 && !/[.?!]$/.test(s)) return false;
  if (!/[.?!]/.test(s) && !/\b(is|are|was|were|be|been|have|has|had|do|does|can|could|will|would|may|might|should|must|use|used|using|make|makes)\b/i.test(s)) {
    return false;
  }
  return true;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP.has(t) && !WEAK.has(t));
}

function topTerms(text: string, n: number): string[] {
  const counts = new Map<string, number>();
  for (const t of tokens(text)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, n)
    .map(([w]) => w);
}

function allText(pages: PageText[]) {
  return pages.map((p) => p.text).join("\n");
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function originalCasing(sentence: string, term: string) {
  const match = sentence.match(new RegExp(`\\b(${escapeRe(term)})\\b`, "i"));
  return match?.[1] ?? term;
}

function pickAnswer(
  sentence: string,
  preferred: string[],
  corpusTerms: string[] = [],
  used: Set<string> = new Set(),
): string | null {
  const candidates = [...preferred, ...corpusTerms];
  for (const term of candidates) {
    if (!term || term.length < 4) continue;
    if (used.has(term.toLowerCase())) continue;
    if (new RegExp(`\\b${escapeRe(term)}\\b`, "i").test(sentence)) {
      return originalCasing(sentence, term);
    }
  }
  const ranked = [...new Set(tokens(sentence))]
    .filter((t) => !used.has(t))
    .sort((a, b) => b.length - a.length);
  return ranked[0] ? originalCasing(sentence, ranked[0]) : null;
}

function cloze(sentence: string, answer: string) {
  const re = new RegExp(`\\b${escapeRe(answer)}\\b`, "i");
  if (!re.test(sentence)) return null;
  return sentence.replace(re, "___");
}

function shuffle<T>(items: T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function wordBank(answer: string, extra: string[]) {
  const bank = [answer];
  for (const term of extra) {
    if (bank.length >= 6) break;
    if (term.toLowerCase() === answer.toLowerCase()) continue;
    bank.push(term);
  }
  while (bank.length < 4) bank.push(`option ${bank.length + 1}`);
  return bank;
}

function fourOptions(answer: string, pool: string[]) {
  const options = [answer];
  for (const term of pool) {
    if (options.length >= 4) break;
    if (term.toLowerCase() === answer.toLowerCase()) continue;
    options.push(term);
  }
  while (options.length < 4) options.push(`not ${answer} (${options.length})`);
  return shuffle(options.slice(0, 4));
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
  const corpus = pages.flatMap((p) => sentences(p.text)).join(" ");
  const termPool = [...missed, ...topTerms(corpus, 16)].filter((t) => !JUNK.test(t) && !WEAK.has(t.toLowerCase()));
  const pool = [
    ...flagged.flatMap((t) => sentences(t)),
    ...pages.flatMap((p) => sentences(p.text)),
  ];
  const questions = [];
  const usedAnswers = new Set<string>();
  const usedSentences = new Set<string>();

  for (const sentence of pool) {
    if (questions.length >= 10) break;
    const answer = pickAnswer(sentence, missed, termPool, usedAnswers);
    if (!answer) continue;
    const blank = cloze(sentence, answer);
    if (!blank || blank === sentence) continue;
    usedAnswers.add(answer.toLowerCase());
    usedSentences.add(sentence);
    const options = fourOptions(answer, termPool);
    const correctIndex = options.findIndex((o) => o.toLowerCase() === answer.toLowerCase());
    const page = pages.find((p) => p.text.includes(sentence.slice(0, 40)))?.page ?? null;
    questions.push({
      question: `Complete this sentence from the reading: “${blank.slice(0, 220)}”`,
      options,
      correctIndex: correctIndex < 0 ? 0 : correctIndex,
      explanation: sentence.slice(0, 240),
      difficulty: questions.length < 3 ? "easy" : questions.length < 7 ? "medium" : "hard",
      sourcePage: page,
      concept: answer,
    });
  }

  for (const leftover of pool) {
    if (questions.length >= 10) break;
    if (usedSentences.has(leftover)) continue;
    const concept = pickAnswer(leftover, missed, termPool, usedAnswers);
    if (!concept) continue;
    usedAnswers.add(concept.toLowerCase());
    usedSentences.add(leftover);
    const options = fourOptions(concept, termPool);
    questions.push({
      question: `According to the reading: “${leftover.slice(0, 180)}” — which concept is this about?`,
      options,
      correctIndex: Math.max(0, options.findIndex((o) => o.toLowerCase() === concept.toLowerCase())),
      explanation: leftover.slice(0, 240),
      difficulty: "easy",
      sourcePage: pages.find((p) => p.text.includes(leftover.slice(0, 40)))?.page ?? 1,
      concept,
    });
  }

  for (const concept of termPool) {
    if (questions.length >= 10) break;
    if (!concept || usedAnswers.has(concept.toLowerCase())) continue;
    usedAnswers.add(concept.toLowerCase());
    const snippet = pool.find((s) => s.toLowerCase().includes(concept.toLowerCase())) || pool[0] || corpus.slice(0, 180);
    const options = fourOptions(concept, termPool);
    questions.push({
      question: `Which term from the reading belongs with: “${snippet.slice(0, 160)}”?`,
      options,
      correctIndex: Math.max(0, options.findIndex((o) => o.toLowerCase() === concept.toLowerCase())),
      explanation: snippet.slice(0, 240),
      difficulty: "easy",
      sourcePage: pages[0]?.page ?? 1,
      concept,
    });
  }

  while (questions.length < 4) {
    const concept = termPool[questions.length] || "the main argument";
    const snippet = pool[0] || corpus.slice(0, 180) || "the uploaded reading";
    const options = fourOptions(concept, [...termPool, "likelihood", "posterior", "evidence"]);
    questions.push({
      question: `Which term from the reading belongs with: “${snippet.slice(0, 160)}”?`,
      options,
      correctIndex: Math.max(0, options.findIndex((o) => o.toLowerCase() === concept.toLowerCase())),
      explanation: snippet.slice(0, 240),
      difficulty: "easy",
      sourcePage: pages[0]?.page ?? 1,
      concept,
    });
  }

  return quizSchema.parse({ questions: questions.slice(0, 10) });
}

export function fallbackMatchPairs(pages: PageText[], missed: string[]) {
  const sents = pages.flatMap((p) => sentences(p.text));
  const terms = [...missed, ...topTerms(allText(pages), 16)]
    .filter((t, i, arr) => t && arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
    .slice(0, 8);
  const pairs = terms.map((term) => {
    const snippet = sents.find((s) => s.toLowerCase().includes(term.toLowerCase()));
    return {
      term,
      definition: snippet ? snippet.slice(0, 110) : `A key idea in this reading related to ${term}.`,
    };
  });
  while (pairs.length < 4) {
    const term = `idea ${pairs.length + 1}`;
    pairs.push({ term, definition: sents[pairs.length]?.slice(0, 110) || `A key idea in this reading related to ${term}.` });
  }
  return matchPairsSchema.parse({ pairs: pairs.slice(0, 8) });
}

export function fallbackFillBlank(pages: PageText[], missed: string[]) {
  const sents = pages.flatMap((p) =>
    sentences(p.text).map((s) => ({ s, page: p.page })),
  );
  const items = [];
  const used = new Set<string>();
  for (const { s, page } of sents) {
    if (items.length >= 8) break;
    const answer = pickAnswer(s, missed, topTerms(allText(pages), 16), used);
    if (!answer || used.has(answer.toLowerCase())) continue;
    const sentence = cloze(s, answer);
    if (!sentence) continue;
    used.add(answer.toLowerCase());
    const bank = wordBank(answer, topTerms(allText(pages), 8));
    items.push({ sentence, answer, bank, sourcePage: page, concept: answer });
  }
  while (items.length < 8) {
    const row = sents[items.length];
    const answer = missed[items.length] || topTerms(allText(pages), 8)[items.length] || "concept";
    items.push({
      sentence: row ? cloze(row.s, pickAnswer(row.s, [answer]) || answer) || row.s : `In this reading, ___ is a central idea you should be able to explain.`,
      answer: pickAnswer(row?.s ?? "", [answer]) || answer,
      bank: wordBank(pickAnswer(row?.s ?? "", [answer]) || answer, topTerms(allText(pages), 4)),
      sourcePage: row?.page ?? 1,
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
      text: `The authors never mention ${missed[0] || topTerms(allText(pages), 1)[0] || "the main topic"}.`,
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
