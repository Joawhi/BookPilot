# LLM contracts

All prompts live in `server/src/llm/prompts.ts`. The model must return JSON (no markdown). `parseLlmJson` is defensive anyway.

If `OPENAI_API_KEY` is missing, `server/src/llm/fallback.ts` implements the same shapes from extracted sentences.

**Citations are not an LLM output.** The explain/reference step only returns search queries; `services/references.ts` fills papers.

## Shared sampling

Before any generation, `denseSample.ts` splits pages into ~1500-character chunks, scores them by unique-token density, and keeps the top chunks plus any pages tied to flagged notes. Missed concepts (`Concept.missCount`) are prepended to the prompt as "prioritize these".

## Explain

**In:** passage + optional surrounding context (same page ± neighbors).

```json
{ "explanation": "2-3 plain sentences.", "concepts": ["Concept A", "Concept B"] }
```

## Reference queries

**In:** same as explain.

```json
{ "queries": ["specific academic search 1", "search 2"], "concepts": ["..."] }
```

2–3 queries. No paper titles.

## Session recap

**In:** list of saved notes + flagged passages + papers already fetched this session.

```json
{ "recap": "short markdown-ish plain text: key points, then a references list using only the provided papers." }
```

## Quiz

**In:** sampled text, flagged passages, missed concepts.

```json
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "one or two sentences",
      "difficulty": "easy",
      "sourcePage": 3,
      "sourceDocumentName": "paper.pdf",
      "concept": "Bayes theorem"
    }
  ]
}
```

Exactly 10 questions. `correctIndex` is 0–3. Prioritize flagged / missed concepts.

## Minigames

### match_pairs

```json
{ "pairs": [ { "term": "...", "definition": "..." } ] }
```

6–8 pairs.

### fill_blank

```json
{
  "items": [
    { "sentence": "The ___ is the ...", "answer": "mitochondria", "bank": ["mitochondria", "nucleus", "ribosome", "golgi"], "sourcePage": 2, "concept": "cell" }
  ]
}
```

8 items. `bank` has 4–6 words including the answer. Sentence uses `___` as the blank.

### true_false

```json
{
  "statements": [
    { "text": "...", "isTrue": true, "explanation": "...", "sourcePage": 1, "concept": "..." }
  ]
}
```

12 statements. Mix true/false.

### sequence_sort

```json
{
  "puzzles": [
    {
      "title": "PCR steps",
      "items": [ { "id": "a", "text": "Denaturation" }, { "id": "b", "text": "Annealing" } ],
      "correctOrder": ["a", "b"],
      "concept": "PCR"
    }
  ]
}
```

3 puzzles, 4–6 steps each.

## Fallback behaviour

Without a key, the fallback:

- Explain: rewrites the passage by taking the first 2–3 sentences and simplifying quotes.
- Queries: top capitalized phrases / long tokens.
- Quiz: cloze-style questions from dense sentences with distractors from other sentences.
- Minigames: terms = frequent noun-like tokens; sequences = consecutive sentences.

Good enough to exercise the UI; not a substitute for a real model on PhD papers.
