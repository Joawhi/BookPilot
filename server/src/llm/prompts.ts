import { z } from "zod";

export const explainSchema = z.object({
  explanation: z.string().min(1),
  concepts: z.array(z.string()).default([]),
});

export const querySchema = z.object({
  queries: z.array(z.string()).min(1).max(4),
  concepts: z.array(z.string()).default([]),
});

export const recapSchema = z.object({
  recap: z.string().min(1),
});

export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(4).max(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        sourcePage: z.number().int().nullable().optional(),
        sourceDocumentName: z.string().nullable().optional(),
        concept: z.string().nullable().optional(),
      }),
    )
    .min(4)
    .max(12),
});

export const matchPairsSchema = z.object({
  pairs: z
    .array(z.object({ term: z.string(), definition: z.string() }))
    .min(4)
    .max(10),
});

export const fillBlankSchema = z.object({
  items: z
    .array(
      z.object({
        sentence: z.string(),
        answer: z.string(),
        bank: z.array(z.string()).min(3),
        sourcePage: z.number().int().nullable().optional(),
        concept: z.string().nullable().optional(),
      }),
    )
    .min(4),
});

export const trueFalseSchema = z.object({
  statements: z
    .array(
      z.object({
        text: z.string(),
        isTrue: z.boolean(),
        explanation: z.string(),
        sourcePage: z.number().int().nullable().optional(),
        concept: z.string().nullable().optional(),
      }),
    )
    .min(6),
});

export const sequenceSchema = z.object({
  puzzles: z
    .array(
      z.object({
        title: z.string(),
        items: z.array(z.object({ id: z.string(), text: z.string() })).min(3),
        correctOrder: z.array(z.string()).min(3),
        concept: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

const SYSTEM = `You help university students understand dense academic PDFs.
Return ONLY valid JSON matching the requested schema. No markdown. No invented citations or paper titles.
Keep language plain and concise.`;

export function explainPrompt(passage: string, context: string) {
  return {
    system: SYSTEM,
    user: `Explain this passage in 2-3 plain sentences a tired PhD student would thank you for. Do not add facts that are not in the passage or context.

Passage:
"""${passage}"""

Surrounding context:
"""${context.slice(0, 2500)}"""

JSON: { "explanation": string, "concepts": string[] }`,
  };
}

export function queriesPrompt(passage: string, context: string) {
  return {
    system: SYSTEM,
    user: `Extract 2-3 academic search queries that would find REAL papers related to this passage. Queries should be specific (key terms, methods, theory names). Never invent paper titles.

Passage:
"""${passage}"""

Context:
"""${context.slice(0, 1500)}"""

JSON: { "queries": string[], "concepts": string[] }`,
  };
}

export function recapPrompt(notes: string, papers: string) {
  return {
    system: SYSTEM,
    user: `Write a concise reading recap: 4-7 key points, then list the provided references (title + year + url). Use ONLY the papers listed. If none, say so.

Notes and flagged passages:
${notes.slice(0, 6000)}

Papers already collected (do not invent more):
${papers.slice(0, 4000)}

JSON: { "recap": string }`,
  };
}

export function quizPrompt(material: string, flagged: string, missed: string[]) {
  return {
    system: SYSTEM,
    user: `Create exactly 10 multiple-choice questions from this study set.
Rules:
- 4 options, one correct, correctIndex 0-3
- short explanation
- difficulty easy|medium|hard
- include sourcePage when possible and a concept label
- PRIORITIZE flagged confusing passages and missed concepts
- Do not ask about trivia formatting; test understanding

Missed concepts to reuse: ${missed.join(", ") || "(none yet)"}

Flagged passages:
${flagged.slice(0, 2500)}

Material:
${material.slice(0, 12000)}

JSON: { "questions": [ { "question", "options", "correctIndex", "explanation", "difficulty", "sourcePage", "sourceDocumentName", "concept" } ] }`,
  };
}

export function matchPairsPrompt(material: string, missed: string[]) {
  return {
    system: SYSTEM,
    user: `Create 6-8 term/definition pairs from the material. Definitions <= 20 words. Prioritize: ${missed.join(", ") || "core terms"}.

${material.slice(0, 9000)}

JSON: { "pairs": [ { "term", "definition" } ] }`,
  };
}

export function fillBlankPrompt(material: string, missed: string[]) {
  return {
    system: SYSTEM,
    user: `Create 8 fill-in-the-blank items. Sentence uses ___ for the blank. Bank has 4-6 options including the answer. Prioritize: ${missed.join(", ") || "key terms"}.

${material.slice(0, 9000)}

JSON: { "items": [ { "sentence", "answer", "bank", "sourcePage", "concept" } ] }`,
  };
}

export function trueFalsePrompt(material: string, missed: string[]) {
  return {
    system: SYSTEM,
    user: `Create 12 true/false statements about the material. Mix true and false. False ones should be plausible misconceptions. Prioritize: ${missed.join(", ") || "core claims"}.

${material.slice(0, 9000)}

JSON: { "statements": [ { "text", "isTrue", "explanation", "sourcePage", "concept" } ] }`,
  };
}

export function sequencePrompt(material: string, missed: string[]) {
  return {
    system: SYSTEM,
    user: `Create 3 sequence puzzles (process steps or timeline events) from the material. 4-6 steps each, ids a,b,c,... Prioritize: ${missed.join(", ") || "processes"}.

${material.slice(0, 9000)}

JSON: { "puzzles": [ { "title", "items": [ { "id", "text" } ], "correctOrder", "concept" } ] }`,
  };
}
