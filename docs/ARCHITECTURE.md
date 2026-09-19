# Architecture

BookPilot is a small modular monolith: one Node process, one SQLite file, one React SPA.

```
┌──────────────────────────────────────────────┐
│  client/  React SPA (Vite)                   │
│  pages talk only to client/src/api/client.ts │
└────────────────────┬─────────────────────────┘
                     │ /api/*  JSON + multipart
┌────────────────────▼─────────────────────────┐
│  server/src/app.ts                           │
│    auth middleware (JWT Bearer)              │
│    routes/*  (one file per resource)         │
│    services/* (PDF, generation, references,  │
│                scoring, dense sampling)      │
│    llm/*      (provider + prompts + fallback)│
│    Prisma     (schema in /prisma)            │
└──────────────────────────────────────────────┘
```

## Request lifecycle

1. Browser sends JSON or multipart to `/api/...`.
2. `middleware/auth.ts` loads `req.user` from the JWT (public routes skip this).
3. The route validates input with Zod, calls a service, maps the Prisma row to a DTO from `shared/types.ts`.
4. Errors go through `middleware/error.ts` and return `{ error, code }`.

## Upload + generation

```
POST /api/study-sets  (multipart PDFs)
        │
        ├─ save files under data/uploads/<userId>/
        ├─ extract text per page (pdfjs)
        ├─ if no extractable text → 400 scanned_pdf
        ├─ insert StudySet + Documents
        └─ enqueue generateForStudySet()   // does not block the response
                │
                ├─ quizStatus = generating
                ├─ sample dense sections
                ├─ LLM (or fallback) → QuizQuestion rows
                ├─ LLM (or fallback) → MinigameContent rows
                └─ quizStatus / gamesStatus = ready
```

The client polls `GET /api/study-sets/:id` every few seconds on the hub until both features are ready. The Reader does not wait.

## Auth

Email + password. Passwords hashed with bcrypt. JWT in `localStorage` under `bookpilot.token`, sent as `Authorization: Bearer`. This is the simplest SPA pattern and is easy to swap for httpOnly cookies later.

## Privacy

- Every query that loads a study set / document / note filters by `userId`.
- PDF bytes are streamed only to the owner (`GET /api/documents/:id/file`).
- Nothing is shared between users.

## LLM boundary

`server/src/llm/index.ts` is the only module that talks to a model provider.

- If `OPENAI_API_KEY` is set → chat completions, `response_format: json_object`.
- If not → `server/src/llm/fallback.ts` builds questions and explanations from the extracted text so the product remains demoable.

`parseLlmJson` strips markdown fences and validates with Zod.

## Academic references

Flow: passage → LLM (or fallback) extracts 2–3 search queries → `references.ts` hits Semantic Scholar, OpenAlex, arXiv in parallel → dedupe → 3–5 papers with URLs. The model **never** supplies titles/years/links.

## Why SQLite

Fastest on Replit and Cloud Agent VMs (no daemon). Prisma schema avoids Postgres-only types so you can flip the provider later. JSON columns are stored as `String` because SQLite's Prisma JSON is awkward; helpers in `server/src/db/json.ts` parse them.

## What this is not

- Not a multi-tenant SaaS with object storage yet.
- Not a queue/worker architecture. Generation is in-process; if the server restarts mid-job, statuses go back to `pending` and the hub "Regenerate" button (or a re-upload) restarts them. `recoverStuckJobs` on boot retries `generating` rows.
