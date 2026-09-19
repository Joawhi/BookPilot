# AGENTS.md — how to work on BookPilot

This file is the map for coding agents. Read it before changing code.

## What this app is

BookPilot is a private study companion: a user uploads PDFs, reads them, gets explanations and **real** academic references, then plays a quiz and minigames generated from the text.

No camera. No eye tracking. PDFs are private per user and never shared.

## Stack

| Layer | Tech | Where |
|---|---|---|
| Client | React 19 + TypeScript + Vite + React Router | `client/` |
| Server | Express 5 + TypeScript | `server/src/` |
| DB | Prisma + SQLite (Postgres-compatible schema) | `prisma/schema.prisma` |
| Shared types | Plain TS | `shared/` |
| LLM | Server-only OpenAI-compatible client, with extractive fallback | `server/src/llm/` |

Run with `npm run dev` (API `:3001`, Vite `:5173` proxying `/api` and `/uploads`).

## Golden rules

1. **All LLM calls stay on the server.** The browser never sees `OPENAI_API_KEY`.
2. **Never invent citations.** `server/src/services/references.ts` is the only place papers are created, and only from Semantic Scholar / OpenAlex / arXiv results.
3. **Keep DTOs in `shared/types.ts`.** If you add an API field, update that file, the route, and the page that consumes it.
4. **One feature folder, one route file.** Do not dump new endpoints into `index.ts`.
5. **Generation is async.** After upload, the reader is available immediately. Quiz/minigames unlock when `quizStatus` / `gamesStatus` become `"ready"`.
6. **Missed concepts must be reused.** `Concept.missCount` feeds the next quiz and minigame prompts (`server/src/services/generation.ts`).
7. **Do not hardcode API keys.** Use `.env`. If a key is missing, use the fallback — do not crash the request.

## Where to change what

| You want to… | Edit |
|---|---|
| Add an API endpoint | `server/src/routes/<resource>.ts` + register in `server/src/app.ts` + DTO in `shared/types.ts` + document in `docs/API.md` |
| Change scoring | `server/src/services/scoring.ts` + tests in `server/src/services/scoring.test.ts` |
| Change LLM prompts / JSON shape | `server/src/llm/prompts.ts` + `docs/LLM-CONTRACTS.md` + fallback in `server/src/llm/fallback.ts` |
| Change PDF extraction | `server/src/services/pdfExtract.ts` |
| Change reference search | `server/src/services/references.ts` |
| Change a page | `client/src/pages/` |
| Change look & feel | `client/src/styles/tokens.css` then `global.css`. See `docs/DESIGN-SYSTEM.md` |
| Change data model | `prisma/schema.prisma` then `npx prisma db push` + `docs/DATA-MODEL.md` |
| Add a minigame | schema type + generation prompt + `MinigamesPage` + a game page + scoring |

## Feature map (build order)

See `docs/FEATURE-MAP.md`. Short version:

1. Auth + Home + PDF upload
2. Study Set hub + Reader
3. Quiz
4. Minigames
5. Notes & Progress

## Architecture snapshot

```
client  --JSON-->  Express routes  -->  services  -->  Prisma / LLM / academic APIs
                       |
                       +-- auth middleware (JWT)
                       +-- multer (PDF uploads to data/uploads/<userId>/)
```

Background generation is an in-process queue (`server/src/services/generation.ts`). Fine for single-instance Replit / local. Swap for a worker if you scale.

## Testing

- Unit: `npm test` (scoring, JSON parse, dense sampling).
- Manual: log in, upload a text PDF, open Reader, run quiz after status chip is ready.

## Style for future agents

- Prefer small, named functions over clever abstractions.
- Zod-validate every mutating request.
- When LLM JSON is malformed, log it and fall back — never send garbage to the client.
- Keep the Reader chrome minimal; put decoration on hub / games / empty states, not on the page of the PDF.
