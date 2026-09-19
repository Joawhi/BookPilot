# HTTP API

Base path: `/api`. JSON unless noted. Auth: `Authorization: Bearer <jwt>` except `/api/auth/*`.

Errors: `{ "error": "human message", "code": "snake_case" }` with 4xx/5xx.

DTO shapes live in `shared/types.ts`.

## Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | no | `{ email, password, displayName }` | `AuthResponse` |
| POST | `/auth/login` | no | `{ email, password }` | `AuthResponse` |
| GET | `/auth/me` | yes | | `UserPublic` |

## Home & study sets

| Method | Path | Notes |
|---|---|---|
| GET | `/home` | `HomePayload` — sets, continue reading, confusion points, `llmEnabled` |
| GET | `/study-sets` | list |
| POST | `/study-sets` | `multipart/form-data` field `files` (1–5 PDFs). Creates the set, extracts text, enqueues generation. 400 `scanned_pdf` if nothing extractable. |
| GET | `/study-sets/:id` | `StudySetDetail` including status chips |
| POST | `/study-sets/:id/regenerate` | `{ target: "quiz" \| "games" \| "all" }` |
| PATCH | `/study-sets/:id/progress` | `{ documentId, page }` last-read cursor |

## Documents

| Method | Path | Notes |
|---|---|---|
| GET | `/documents/:id/file` | PDF bytes, owner only |
| GET | `/documents/:id` | metadata + page count |

## Reader

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/reader/explain` | `{ documentId, page, passage, context? }` | `ExplainResponse` |
| POST | `/reader/references` | `{ documentId, page, passage, context? }` | `ReferencesResponse` (real papers only) |
| POST | `/reader/sessions` | `{ studySetId, documentId }` | `{ id }` |
| POST | `/reader/sessions/:id/end` | | `SessionRecap` |

## Notes

| Method | Path | Notes |
|---|---|---|
| POST | `/notes` | create (explain/flag/save). `{ studySetId, documentId, passage, page, explanation?, references?, flagged?, comment? }` |
| GET | `/notes?studySetId=&flagged=` | list |
| PATCH | `/notes/:id` | update comment / flagged |
| DELETE | `/notes/:id` | |

## Quiz

| Method | Path | Notes |
|---|---|---|
| GET | `/study-sets/:id/quiz` | `QuizStartPayload` (no correct answers) |
| POST | `/study-sets/:id/quiz/grade` | `QuizGradeRequest` → `QuizGradeResponse` |
| POST | `/study-sets/:id/quiz/finish` | `{ score, accuracy, bestStreak, missedConcepts, answers[] }` stores `GameResult` |

## Minigames

| Method | Path | Notes |
|---|---|---|
| GET | `/study-sets/:id/minigames/:type` | cached content |
| POST | `/study-sets/:id/minigames/:type/regenerate` | rebuild one game |
| POST | `/study-sets/:id/games/finish` | `{ gameType, score, accuracy, bestStreak, missedConcepts }` |

`type` ∈ `match_pairs` \| `fill_blank` \| `true_false` \| `sequence_sort`

## Progress

| Method | Path | Notes |
|---|---|---|
| GET | `/study-sets/:id/progress` | `ProgressPayload` |
