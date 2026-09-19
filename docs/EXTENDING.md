# Extending BookPilot

Recipes for the changes agents are asked to make most often.

## Add a field to an API response

1. Add it to the interface in `shared/types.ts`.
2. Map it in the route (or a `toSummary()` helper in `server/src/db/map.ts`).
3. Read it in the page.
4. Mention it in `docs/API.md`.

## Add a new minigame

1. Add the type to `MINIGAME_TYPES` in `shared/constants.ts`.
2. Document the JSON in `docs/LLM-CONTRACTS.md`.
3. Add a prompt + Zod schema in `server/src/llm/prompts.ts`.
4. Generate it in `generation.ts` (it already loops types).
5. Add a page under `client/src/pages/games/` and a card on `MinigamesPage`.
6. Finish via `POST /study-sets/:id/games/finish`.

## Swap the LLM provider

Set `OPENAI_BASE_URL` and `OPENAI_MODEL`. Groq example:

```
OPENAI_API_KEY=gsk_...
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-20b
```

`server/src/llm/index.ts` already speaks the OpenAI chat-completions dialect.

## Make generation a real queue

Replace `enqueue()` in `generation.ts` with a push to Redis/BullMQ. Keep the same status fields so the UI does not change.

## Store PDFs on S3

Change `pdfExtract.ts` / `studySets.ts` to write the buffer to a bucket and store the key in `Document.storagePath`. `GET /documents/:id/file` then streams from the bucket after the ownership check.

## Stricter auth cookies

In `routes/auth.ts`, set an httpOnly cookie instead of returning `token`, and read it in `middleware/auth.ts`. The React `AuthContext` would then rely on `GET /auth/me` only.

## Add tests

Put them next to the unit (`*.test.ts`) and run `npm test`. Prefer testing scoring, JSON parsing, and dense sampling — they are pure and regression-prone.
