# Data model

Prisma schema: `prisma/schema.prisma`. Default DB: SQLite file `data/bookpilot.db`.

```
User 1──* StudySet 1──* Document
               │
               ├──* Note
               ├──* ReadingSession
               ├──* QuizQuestion
               ├──* MinigameContent   (unique per type)
               ├──* GameResult
               └──* Concept           (unique per name in the set)
```

## Tables

| Model | Role |
|---|---|
| `User` | Email/password account. |
| `StudySet` | One upload batch (1–5 PDFs). Holds generation status, last-read cursor, best score, total points. |
| `Document` | One PDF. `extractedText` is a JSON array of `{ page, text }`. `storagePath` is local and private. |
| `ReadingSession` | Opened when the Reader loads; `endedAt` + `recap` filled by End session. |
| `Note` | Saved passage. `flagged` = confusion point. `references` JSON. |
| `QuizQuestion` | Cached 10-question set for the study set. Regenerating replaces rows. |
| `MinigameContent` | Cached JSON per minigame type. Regenerating upserts. |
| `GameResult` | One finished playthrough. Feeds charts and best scores. |
| `Concept` | Running miss/hit counts. High `missCount` = "Topics to review" and extra weight in generation. |

## Status fields

`StudySet.quizStatus` and `gamesStatus`: `pending` → `generating` → `ready` | `failed`.

## JSON-in-string columns

SQLite + Prisma: we store JSON as `String`. Parse with `server/src/db/json.ts`.

| Column | Parsed as |
|---|---|
| `Document.extractedText` | `PageText[]` |
| `Note.references` / `ReadingSession.references` | `ReferencePaper[]` |
| `QuizQuestion.options` | `string[]` (length 4) |
| `MinigameContent.content` | minigame payload |
| `GameResult.missedConcepts` | `string[]` |

## Switching to PostgreSQL

1. `provider = "postgresql"` in the schema.
2. `DATABASE_URL=postgresql://...`
3. Optionally change those String columns to Prisma `Json`.
4. `npx prisma db push` (or migrate).
